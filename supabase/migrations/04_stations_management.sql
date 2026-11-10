-- ==============================================================================
-- OLIVEAL GAMING ZONE — ADMIN STATIONS MANAGEMENT & SLOT RELEASE MIGRATION
-- Supports:
-- 1. Transparent customer visibility of disabled stations ("Temporarily Unavailable")
--    while strictly blocking new bookings for disabled stations at DB level.
-- 2. Atomic admin slot release RPC (release_booked_slot) preserving full booking history.
-- 3. Realtime updates on public.stations for instant customer/admin sync.
-- ==============================================================================
-- Compatible with 01_auth_schema.sql, 02_stations_and_bookings.sql, and 03_spot_bookings.sql.
-- Safe & idempotent: never drops tables, never deletes bookings, never alters station IDs.
-- ==============================================================================

-- 1. Allow customers & admins to read station registry (including is_active status)
--    so disabled stations display cleanly as "Temporarily Unavailable" instead of disappearing.
--    Note: Write operations (INSERT/UPDATE/DELETE) on public.stations remain strictly admin-only.
DROP POLICY IF EXISTS "Anyone can view active stations" ON public.stations;
DROP POLICY IF EXISTS "Anyone can view gaming stations" ON public.stations;

CREATE POLICY "Anyone can view gaming stations"
ON public.stations
FOR SELECT
USING (true);

-- 2. Ensure helpful index for station + date queries & cancelled/released history queries
CREATE INDEX IF NOT EXISTS idx_bookings_station_status_start
  ON public.bookings (station_id, status, start_at DESC);

-- 3. Strengthen create_customer_booking to verify station existence & active state under lock
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

  -- Transaction-scoped lock per station to prevent race-condition double bookings & stale station reads
  PERFORM pg_advisory_xact_lock(hashtext(p_station_id::text));

  -- Lock & verify target station activation status
  SELECT * INTO v_station
  FROM public.stations
  WHERE id = p_station_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected gaming station does not exist.';
  END IF;

  IF NOT v_station.is_active THEN
    RAISE EXCEPTION 'Selected gaming station (%) is temporarily unavailable.', v_station.name;
  END IF;

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

  RETURN jsonb_build_object(
    'booking', to_jsonb(v_booking),
    'station', to_jsonb(v_station)
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time slot is unavailable. Please choose another time.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_booking(UUID, TIMESTAMPTZ, INTEGER, INTEGER, BOOLEAN)
  TO authenticated;

-- 4. Atomic Admin Slot Release RPC
--    Safely transitions an eligible confirmed booking to 'cancelled', preserving all financial
--    and historical fields, while immediately freeing the interval from bookings_no_confirmed_overlap.
CREATE OR REPLACE FUNCTION public.release_booked_slot(
  p_booking_id UUID,
  p_station_id UUID,
  p_booking_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_booking public.bookings%ROWTYPE;
  v_station public.stations%ROWTYPE;
  v_start_ist_date DATE;
  v_end_ist_date DATE;
BEGIN
  -- 1. Strict admin authorization
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please log in as an administrator.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrative privileges required to release booked slots.';
  END IF;

  IF p_booking_id IS NULL OR p_station_id IS NULL THEN
    RAISE EXCEPTION 'Booking ID and Station ID are required.';
  END IF;

  -- 2. Acquire station-level transaction lock & row lock to serialize concurrent actions
  PERFORM pg_advisory_xact_lock(hashtext(p_station_id::text));

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking record no longer exists.';
  END IF;

  -- 3. Station scope guard (never accidentally release a different station's booking)
  IF v_booking.station_id <> p_station_id THEN
    RAISE EXCEPTION 'Selected booking does not belong to this station.';
  END IF;

  -- 4. IST calendar date scope guard (never release a booking from a different date)
  IF p_booking_date IS NOT NULL THEN
    v_start_ist_date := timezone('Asia/Kolkata', v_booking.start_at)::date;
    v_end_ist_date := timezone('Asia/Kolkata', v_booking.end_at - interval '1 second')::date;

    IF v_start_ist_date <> p_booking_date AND v_end_ist_date <> p_booking_date THEN
      RAISE EXCEPTION 'Selected booking does not match the selected date (%).', p_booking_date;
    END IF;
  END IF;

  -- 5. Lifecycle & check-in safety rules
  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'This booking has already been cancelled.';
  END IF;

  IF v_booking.checked_in_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot release this slot because the customer has already checked in.';
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bookings can be released (current status: %).', v_booking.status;
  END IF;

  IF v_booking.end_at <= now() THEN
    RAISE EXCEPTION 'Cannot release a booking that has already ended.';
  END IF;

  -- 6. Preserve record & historical pricing/metadata; update status only
  UPDATE public.bookings
  SET
    status = 'cancelled',
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id
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

REVOKE ALL ON FUNCTION public.release_booked_slot(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_booked_slot(UUID, UUID, DATE) TO authenticated;

-- 5. Enable Supabase Realtime publication on public.stations idempotently
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.stations;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

