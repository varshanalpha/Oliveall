-- ==============================================================================
-- OLIVEAL GAMING ZONE — STATIONS & BOOKINGS SCHEMA
-- Feature 2 & 3 Foundation: Stations Catalog, Slot Availability & Bookings
-- ==============================================================================
-- Compatible with 01_auth_schema.sql (reuses public.profiles & public.is_admin()).
-- ==============================================================================

-- 1. Enable btree_gist extension for PostgreSQL timestamp-range exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Shared updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- 3. STATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  tag TEXT NOT NULL,
  station_type TEXT NOT NULL CHECK (station_type IN ('ps5', 'simulator')),
  description TEXT,
  image_url TEXT,
  max_players INTEGER NOT NULL DEFAULT 2 CHECK (max_players IN (1, 2)),
  hourly_rate_1p INTEGER NOT NULL CHECK (hourly_rate_1p > 0),
  hourly_rate_2p INTEGER CHECK (hourly_rate_2p IS NULL OR hourly_rate_2p > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS set_stations_updated_at ON public.stations;
CREATE TRIGGER set_stations_updated_at
BEFORE UPDATE ON public.stations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS on stations
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active stations" ON public.stations;
CREATE POLICY "Anyone can view active stations"
ON public.stations
FOR SELECT
USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert stations" ON public.stations;
CREATE POLICY "Admins can insert stations"
ON public.stations
FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update stations" ON public.stations;
CREATE POLICY "Admins can update stations"
ON public.stations
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete stations" ON public.stations;
CREATE POLICY "Admins can delete stations"
ON public.stations
FOR DELETE
USING (public.is_admin());

-- ==============================================================================
-- 4. SEED 6 PHYSICAL GAMING STATIONS
-- ==============================================================================
INSERT INTO public.stations (
  slug, name, category, tag, station_type, description, image_url,
  max_players, hourly_rate_1p, hourly_rate_2p, display_order, is_active
)
VALUES
  (
    'alpha',
    'ALPHA',
    'PS5 Console',
    'PS5',
    'ps5',
    'Sony PlayStation 5 4K 120Hz gaming station with DualSense wireless controllers.',
    '/assets/images/ps5-station.png',
    2,
    150,
    200,
    1,
    true
  ),
  (
    'beta',
    'BETA',
    'PS5 Console',
    'PS5',
    'ps5',
    'Sony PlayStation 5 4K 120Hz gaming station with high-fidelity 3D audio.',
    '/assets/images/ps5-station.png',
    2,
    150,
    200,
    2,
    true
  ),
  (
    'gamma',
    'GAMMA',
    'PS5 Console',
    'PS5',
    'ps5',
    'Sony PlayStation 5 premium battle station with dual pro controller support.',
    '/assets/images/ps5-station.png',
    2,
    150,
    200,
    3,
    true
  ),
  (
    'delta',
    'DELTA',
    'PS5 Console',
    'PS5',
    'ps5',
    'Sony PlayStation 5 esports tournament rig with low-latency display.',
    '/assets/images/ps5-station.png',
    2,
    150,
    200,
    4,
    true
  ),
  (
    'rs-1',
    'RS 1',
    'Racing Simulator',
    'Racing Sim',
    'simulator',
    'Direct-drive force feedback racing cockpit with load-cell pedals and wrap-around immersion.',
    '/assets/images/racing-simulator.png',
    1,
    200,
    NULL,
    5,
    true
  ),
  (
    'rs-2',
    'RS 2',
    'Racing Simulator',
    'Racing Sim',
    'simulator',
    'Pro racing chassis with hydraulic pedals, dynamic haptic feedback, and sequential shifter.',
    '/assets/images/racing-simulator.png',
    1,
    200,
    NULL,
    6,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  tag = EXCLUDED.tag,
  station_type = EXCLUDED.station_type,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  max_players = EXCLUDED.max_players,
  hourly_rate_1p = EXCLUDED.hourly_rate_1p,
  hourly_rate_2p = EXCLUDED.hourly_rate_2p,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 5. BOOKINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (60, 90, 120)),
  player_count INTEGER NOT NULL CHECK (player_count IN (1, 2)),
  station_charge NUMERIC(10, 2) NOT NULL CHECK (station_charge >= 0),
  platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 20.00 CHECK (platform_fee >= 0),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount = station_charge + platform_fee),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('pending_payment', 'confirmed', 'completed', 'cancelled', 'expired')
  ),
  terms_accepted BOOLEAN NOT NULL DEFAULT false CHECK (terms_accepted = true),
  hold_expires_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT bookings_end_after_start CHECK (end_at > start_at)
);

-- Indexes for fast station overlap queries and user booking history lookups
CREATE INDEX IF NOT EXISTS idx_bookings_station_time
  ON public.bookings (station_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_bookings_user_start
  ON public.bookings (user_id, start_at DESC);

-- Prevent overlapping confirmed bookings on the same station at the DB level
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_confirmed_overlap;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_confirmed_overlap
  EXCLUDE USING gist (
    station_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status = 'confirmed');

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. SERVER-SIDE BUSINESS RULES & PRICING VALIDATION TRIGGER
-- ==============================================================================
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

  -- Enforce station player capacity (e.g. Racing Simulators max 1 player)
  IF NEW.player_count > v_station.max_players THEN
    RAISE EXCEPTION '% accommodates a maximum of % player(s) at a time.',
      v_station.name, v_station.max_players;
  END IF;

  -- Enforce authoritative end_at = start_at + duration_minutes
  NEW.end_at := NEW.start_at + make_interval(mins => NEW.duration_minutes);

  -- Enforce IST date eligibility on new inserts or schedule changes
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

      IF v_booking_date_ist > v_tomorrow_ist THEN
        RAISE EXCEPTION 'Bookings beyond tomorrow are not permitted.';
      END IF;

      IF v_booking_date_ist = v_tomorrow_ist AND EXTRACT(HOUR FROM v_now_ist) < 20 THEN
        RAISE EXCEPTION 'Advance bookings for tomorrow unlock daily at 8:00 PM IST.';
      END IF;
    END IF;

    -- Authoritative server-side pricing computation
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
    NEW.platform_fee := 20.00;
    NEW.total_amount := NEW.station_charge + NEW.platform_fee;
  END IF;

  -- Auto-generate readable unique booking number if not provided
  IF NEW.booking_number IS NULL OR length(trim(NEW.booking_number)) = 0 THEN
    NEW.booking_number :=
      'OGZ-' ||
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

-- ==============================================================================
-- 7. BOOKINGS ROW-LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own bookings, Admins view all" ON public.bookings;
CREATE POLICY "Users view own bookings, Admins view all"
ON public.bookings
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
CREATE POLICY "Users create own bookings"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any booking" ON public.bookings;
CREATE POLICY "Admins can update any booking"
ON public.bookings
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ==============================================================================
-- 8. SECURE RPCs (ANONYMIZED AVAILABILITY + ATOMIC BOOKING CREATION)
-- ==============================================================================

-- 8A. Anonymized Booked Slots RPC:
-- Returns active slot intervals for a station in [p_range_start, p_range_end)
-- WITHOUT exposing any user_id, booking_number, or pricing info of other users.
CREATE OR REPLACE FUNCTION public.get_station_booked_slots(
  p_station_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  player_count INTEGER,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    b.id,
    b.start_at,
    b.end_at,
    b.duration_minutes,
    b.player_count,
    b.status
  FROM public.bookings b
  WHERE b.station_id = p_station_id
    AND b.start_at < p_range_end
    AND b.end_at > p_range_start
    AND (
      b.status = 'confirmed'
      OR (
        b.status = 'pending_payment'
        AND b.hold_expires_at IS NOT NULL
        AND b.hold_expires_at > now()
      )
    )
  ORDER BY b.start_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_station_booked_slots(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, anon;

-- 8B. Atomic Booking Creation RPC:
-- Acquires per-station transaction advisory lock, expires stale holds, checks overlap
-- across confirmed + unexpired holds, and inserts the authoritative booking row.
-- Note: Defaults status to 'confirmed' for immediate pre-Razorpay testing; in Phase 3
-- payment integration, switch default status to 'pending_payment' and confirm via webhook.
CREATE OR REPLACE FUNCTION public.create_customer_booking(
  p_station_id UUID,
  p_start_at TIMESTAMPTZ,
  p_duration_minutes INTEGER,
  p_player_count INTEGER,
  p_terms_accepted BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_end_at TIMESTAMPTZ;
  v_conflict_exists BOOLEAN;
  v_booking public.bookings%ROWTYPE;
  v_station public.stations%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a booking.';
  END IF;

  IF NOT COALESCE(p_terms_accepted, false) THEN
    RAISE EXCEPTION 'Booking Terms & Conditions must be accepted.';
  END IF;

  -- Transaction-scoped lock per station to prevent race-condition double bookings
  PERFORM pg_advisory_xact_lock(hashtext(p_station_id::text));

  -- Expire stale pending payment holds for this station
  UPDATE public.bookings
  SET status = 'expired'
  WHERE station_id = p_station_id
    AND status = 'pending_payment'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= now();

  v_end_at := p_start_at + make_interval(mins => p_duration_minutes);

  -- Check half-open interval overlap [start_at, end_at) against active bookings
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
    RAISE EXCEPTION 'This time slot is unavailable. Please choose another time.';
  END IF;

  -- Insert booking (validate_booking_rules trigger computes pricing, booking_number & validates rules)
  INSERT INTO public.bookings (
    user_id,
    station_id,
    start_at,
    end_at,
    duration_minutes,
    player_count,
    station_charge,
    platform_fee,
    total_amount,
    status,
    terms_accepted
  )
  VALUES (
    v_user_id,
    p_station_id,
    p_start_at,
    v_end_at,
    p_duration_minutes,
    p_player_count,
    0,
    20.00,
    20.00,
    'confirmed',
    true
  )
  RETURNING * INTO v_booking;

  SELECT * INTO v_station
  FROM public.stations
  WHERE id = v_booking.station_id;

  RETURN jsonb_build_object(
    'booking', to_jsonb(v_booking),
    'station', to_jsonb(v_station)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_booking(UUID, TIMESTAMPTZ, INTEGER, INTEGER, BOOLEAN)
  TO authenticated;

