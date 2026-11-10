-- ==============================================================================
-- OLIVEAL GAMING ZONE — ADDITIVE SPOT BOOKINGS MIGRATION
-- Supports unregistered walk-in admin spot bookings sharing public.bookings,
-- atomic station overlap locks, and realtime synchronization with customer slots.
-- ==============================================================================
-- Compatible with 01_auth_schema.sql and 02_stations_and_bookings.sql.
-- Safe & idempotent: preserves all existing tables, stations, and customer bookings.
-- ==============================================================================

-- 1. Allow walk-in spot bookings without a registered customer user_id
ALTER TABLE public.bookings
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add missing spot-booking metadata columns safely
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS booking_source TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill/normalize existing rows defensively
UPDATE public.bookings
SET booking_source = 'online'
WHERE booking_source IS NULL;

-- Enforce valid booking_source values
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_source_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_source_check
  CHECK (booking_source IN ('online', 'spot'));

-- Enforce customer identity integrity:
-- Either an online booking linked to a profile (user_id IS NOT NULL)
-- OR an admin walk-in spot booking with a non-empty customer_name.
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_customer_identity_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_identity_check
  CHECK (
    user_id IS NOT NULL
    OR (
      booking_source = 'spot'
      AND length(trim(COALESCE(customer_name, ''))) > 0
    )
  );

-- Helpful indexes for admin spot queries & analytics
CREATE INDEX IF NOT EXISTS idx_bookings_source_created
  ON public.bookings (booking_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_created_by
  ON public.bookings (created_by)
  WHERE created_by IS NOT NULL;

-- 3. Update business rules trigger function to support BOTH online and walk-in spot bookings
CREATE OR REPLACE FUNCTION public.validate_booking_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_station RECORD;
  v_now_ist TIMESTAMP;
  v_today_ist DATE;
  v_tomorrow_ist DATE;
  v_booking_date_ist DATE;
  v_hourly_rate NUMERIC(10, 2);
BEGIN
  -- Normalize booking_source cleanly
  NEW.booking_source := COALESCE(NULLIF(trim(NEW.booking_source), ''), 'online');

  -- Fetch target station
  SELECT * INTO v_station
  FROM public.stations
  WHERE id = NEW.station_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected gaming station does not exist.';
  END IF;

  IF NOT v_station.is_active AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Selected gaming station (%) is currently inactive.', v_station.name;
  END IF;

  -- Enforce station player capacity (e.g., Racing Simulators max 1 player; PS5 max 2)
  IF NEW.player_count IS NULL OR NEW.player_count <= 0 THEN
    RAISE EXCEPTION 'Player count must be at least 1.';
  END IF;

  IF NEW.player_count > v_station.max_players THEN
    RAISE EXCEPTION '% accommodates a maximum of % player(s) at a time.',
      v_station.name, v_station.max_players;
  END IF;

  IF NEW.booking_source = 'spot' THEN
    NEW.customer_name := trim(COALESCE(NEW.customer_name, ''));
    IF length(NEW.customer_name) = 0 THEN
      RAISE EXCEPTION 'Customer full name is required for spot bookings.';
    END IF;
  ELSIF NEW.customer_name IS NOT NULL THEN
    NEW.customer_name := NULLIF(trim(NEW.customer_name), '');
  END IF;

  -- Enforce authoritative end_at = start_at + duration_minutes
  NEW.end_at := NEW.start_at + make_interval(mins => NEW.duration_minutes);

  -- Validate schedule & authoritative pricing on insert or schedule/capacity change
  IF TG_OP = 'INSERT'
     OR NEW.start_at IS DISTINCT FROM OLD.start_at
     OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
     OR NEW.player_count IS DISTINCT FROM OLD.player_count
     OR NEW.station_id IS DISTINCT FROM OLD.station_id
  THEN
    v_now_ist := timezone('Asia/Kolkata', now());
    v_today_ist := v_now_ist::date;
    v_tomorrow_ist := v_today_ist + 1;
    v_booking_date_ist := timezone('Asia/Kolkata', NEW.start_at)::date;

    IF TG_OP = 'INSERT' THEN
      IF v_booking_date_ist < v_today_ist THEN
        RAISE EXCEPTION 'Cannot book slots for past dates.';
      END IF;

      IF NEW.booking_source = 'online' THEN
        IF v_booking_date_ist > v_tomorrow_ist THEN
          RAISE EXCEPTION 'Bookings beyond tomorrow are not permitted.';
        END IF;

        IF v_booking_date_ist = v_tomorrow_ist AND EXTRACT(HOUR FROM v_now_ist) < 20 THEN
          RAISE EXCEPTION 'Advance bookings for tomorrow unlock daily at 8:00 PM IST.';
        END IF;

        IF NEW.start_at <= now() THEN
          RAISE EXCEPTION 'Cannot book slots for times that have already passed. Please choose an upcoming time.';
        END IF;
      ELSE
        -- Spot bookings support any today or future date in Asia/Kolkata (no 8 PM lock),
        -- while preventing creating slots whose window has already passed beyond a 15-min walk-in grace.
        IF NEW.end_at <= now() OR NEW.start_at < (now() - interval '15 minutes') THEN
          RAISE EXCEPTION 'Cannot create a spot booking for a time slot that has already passed.';
        END IF;
      END IF;
    END IF;

    -- Authoritative server-side station rate lookup
    IF v_station.station_type = 'simulator' THEN
      v_hourly_rate := COALESCE(v_station.hourly_rate_1p, 200);
    ELSE
      IF NEW.player_count = 1 THEN
        v_hourly_rate := COALESCE(v_station.hourly_rate_1p, 150);
      ELSE
        v_hourly_rate := COALESCE(v_station.hourly_rate_2p, 200);
      END IF;
    END IF;

    NEW.station_charge := ROUND((v_hourly_rate * NEW.duration_minutes) / 60.0, 2);

    -- Preserve platform_fee cleanly:
    -- Online customer bookings apply ₹20 platform_fee; walk-in spot bookings keep 0.00 (no invented fee).
    IF NEW.booking_source = 'spot' THEN
      NEW.platform_fee := COALESCE(NEW.platform_fee, 0.00);
      IF TG_OP = 'INSERT' THEN
        NEW.platform_fee := 0.00;
      END IF;
    ELSE
      NEW.platform_fee := 20.00;
    END IF;

    NEW.total_amount := NEW.station_charge + NEW.platform_fee;
  END IF;

  -- Auto-generate readable unique booking number if not provided
  IF NEW.booking_number IS NULL OR length(trim(NEW.booking_number)) = 0 THEN
    NEW.booking_number :=
      CASE WHEN NEW.booking_source = 'spot' THEN 'SPOT-' ELSE 'OGZ-' END ||
      regexp_replace(upper(v_station.name), '[^A-Z0-9]', '', 'g') ||
      '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_rules ON public.bookings;
CREATE TRIGGER trg_validate_booking_rules
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking_rules();

-- 4. Update Customer RLS policies safely and add Admin spot booking INSERT policy
DROP POLICY IF EXISTS "Admins can create spot bookings" ON public.bookings;
CREATE POLICY "Admins can create spot bookings"
ON public.bookings
FOR INSERT
WITH CHECK (
  public.is_admin()
  AND booking_source = 'spot'
  AND created_by = auth.uid()
);

-- 5. Atomic Admin Spot Booking RPC (server-side role check + advisory lock + overlap validation)
CREATE OR REPLACE FUNCTION public.create_spot_booking(
  p_station_id UUID,
  p_customer_name TEXT,
  p_start_at TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_player_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_trimmed_name TEXT;
  v_end_at TIMESTAMPTZ;
  v_conflict_exists BOOLEAN;
  v_booking public.bookings%ROWTYPE;
  v_station public.stations%ROWTYPE;
BEGIN
  -- 1. Strict authenticated Admin verification
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please log in as an administrator.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrative privileges required to create spot bookings.';
  END IF;

  -- 2. Input sanitization & contract checks
  v_trimmed_name := trim(COALESCE(p_customer_name, ''));
  IF length(v_trimmed_name) = 0 THEN
    RAISE EXCEPTION 'Customer full name is required.';
  END IF;

  IF p_station_id IS NULL THEN
    RAISE EXCEPTION 'Please select a gaming station.';
  END IF;

  IF p_start_at IS NULL THEN
    RAISE EXCEPTION 'Please select a valid date and start time.';
  END IF;

  IF p_duration_minutes NOT IN (60, 90, 120) THEN
    RAISE EXCEPTION 'Duration must be 60, 90, or 120 minutes.';
  END IF;

  IF p_player_count IS NULL OR p_player_count <= 0 THEN
    RAISE EXCEPTION 'Player count must be at least 1.';
  END IF;

  -- 3. Per-station transaction advisory lock to serialize concurrent booking requests
  PERFORM pg_advisory_xact_lock(hashtext(p_station_id::text));

  -- 4. Expire stale pending payment holds for this station before checking collisions
  UPDATE public.bookings
  SET status = 'expired'
  WHERE station_id = p_station_id
    AND status = 'pending_payment'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= now();

  v_end_at := p_start_at + make_interval(mins => p_duration_minutes);

  -- 5. Strict half-open [start_at, end_at) overlap check across confirmed & active holds
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.station_id = p_station_id
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(p_start_at, v_end_at, '[)')
      AND (
        b.status = 'confirmed'
        OR (
          b.status = 'pending_payment'
          AND b.hold_expires_at IS NOT NULL
          AND b.hold_expires_at > now()
        )
      )
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RAISE EXCEPTION 'This station is already booked during the selected time. Please choose another time.';
  END IF;

  -- 6. Insert spot booking (trigger computes pricing, unique booking_number, and validates capacity/date)
  INSERT INTO public.bookings (
    user_id,
    station_id,
    customer_name,
    start_at,
    end_at,
    duration_minutes,
    player_count,
    station_charge,
    platform_fee,
    total_amount,
    status,
    terms_accepted,
    booking_source,
    created_by
  )
  VALUES (
    NULL,
    p_station_id,
    v_trimmed_name,
    p_start_at,
    v_end_at,
    p_duration_minutes,
    p_player_count,
    0,
    0.00,
    0,
    'confirmed',
    true,
    'spot',
    v_admin_id
  )
  RETURNING * INTO v_booking;

  SELECT * INTO v_station
  FROM public.stations
  WHERE id = v_booking.station_id;

  RETURN jsonb_build_object(
    'booking', to_jsonb(v_booking),
    'station', to_jsonb(v_station)
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This station is already booked during the selected time. Please choose another time.';
END;
$$;

REVOKE ALL ON FUNCTION public.create_spot_booking(UUID, TEXT, TIMESTAMPTZ, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_spot_booking(UUID, TEXT, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;

-- 6. Enable Supabase Realtime publication on public.bookings idempotently
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

