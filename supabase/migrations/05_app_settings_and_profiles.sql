-- ==============================================================================
-- OLIVEAL GAMING ZONE — ADMIN SETTINGS, GLOBAL BOOKING CONTROLS & PROFILE AVATARS
-- Supports:
-- 1. Persistent global booking controls table (public.app_settings) with strict RLS.
-- 2. Database-level enforcement of booking_enabled (Spot & Online) and
--    advance_booking_enabled (Customer future-date blocking, 24/7 same-day allowed).
-- 3. Realtime updates on public.app_settings for instant admin/customer sync.
-- 4. Supabase Storage bucket & policies for admin/user profile picture uploads.
-- ==============================================================================
-- Compatible with 01_auth_schema.sql through 04_stations_management.sql.
-- Safe & idempotent: never drops tables, never deletes bookings, preserves existing rows.
-- ==============================================================================

-- 1. Create persistent global app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial default global settings cleanly (preserve existing admin values if already set)
INSERT INTO public.app_settings (key, value)
VALUES
  ('booking_enabled', 'true'::jsonb),
  ('advance_booking_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Secure Row Level Security on public.app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read booking availability settings" ON public.app_settings;
CREATE POLICY "Public can read booking availability settings"
ON public.app_settings
FOR SELECT
USING (
  key IN ('booking_enabled', 'advance_booking_enabled')
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can insert app settings" ON public.app_settings;
CREATE POLICY "Admins can insert app settings"
ON public.app_settings
FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;
CREATE POLICY "Admins can update app settings"
ON public.app_settings
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete app settings" ON public.app_settings;
CREATE POLICY "Admins can delete app settings"
ON public.app_settings
FOR DELETE
USING (public.is_admin());

-- Helper to cleanly read a boolean app setting (defaults to true when unconfigured)
CREATE OR REPLACE FUNCTION public.get_boolean_app_setting(p_key TEXT, p_default BOOLEAN DEFAULT true)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN jsonb_typeof(value) = 'boolean' THEN (value #>> '{}')::boolean
        WHEN lower(trim(both '"' from value::text)) = 'false' THEN false
        WHEN lower(trim(both '"' from value::text)) = 'true' THEN true
        ELSE p_default
      END
      FROM public.app_settings
      WHERE key = p_key
      LIMIT 1
    ),
    p_default
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_boolean_app_setting(TEXT, BOOLEAN)
  TO authenticated, anon;

-- 3. Strengthen validate_booking_rules() trigger to enforce global booking controls
--    for ALL inserts (both RPCs and any direct REST INSERT attempt), without affecting
--    existing bookings or admin updates/check-ins/releases.
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
  v_booking_enabled BOOLEAN;
  v_advance_enabled BOOLEAN;
BEGIN
  -- Normalize booking_source cleanly
  NEW.booking_source := COALESCE(NULLIF(trim(NEW.booking_source), ''), 'online');

  -- Global booking availability enforcement on new bookings ONLY
  IF TG_OP = 'INSERT' THEN
    v_booking_enabled := public.get_boolean_app_setting('booking_enabled', true);
    IF NOT v_booking_enabled THEN
      RAISE EXCEPTION 'Bookings are temporarily unavailable. Please try again later.';
    END IF;
  END IF;

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
        v_advance_enabled := public.get_boolean_app_setting('advance_booking_enabled', true);
        IF NOT v_advance_enabled AND v_booking_date_ist > v_today_ist THEN
          RAISE EXCEPTION 'Advance bookings for future dates are currently disabled. Same-day bookings remain available.';
        END IF;

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

-- 4. Strengthen create_customer_booking to verify global booking & advance controls early
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
  v_booking_enabled BOOLEAN;
  v_advance_enabled BOOLEAN;
  v_today_ist DATE;
  v_booking_date_ist DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a booking.';
  END IF;

  IF NOT COALESCE(p_terms_accepted, false) THEN
    RAISE EXCEPTION 'Booking Terms & Conditions must be accepted.';
  END IF;

  v_booking_enabled := public.get_boolean_app_setting('booking_enabled', true);
  IF NOT v_booking_enabled THEN
    RAISE EXCEPTION 'Bookings are temporarily unavailable. Please try again later.';
  END IF;

  v_advance_enabled := public.get_boolean_app_setting('advance_booking_enabled', true);
  v_today_ist := timezone('Asia/Kolkata', now())::date;
  v_booking_date_ist := timezone('Asia/Kolkata', p_start_at)::date;

  IF NOT v_advance_enabled AND v_booking_date_ist > v_today_ist THEN
    RAISE EXCEPTION 'Advance bookings for future dates are currently disabled. Same-day bookings remain available.';
  END IF;

  -- Transaction-scoped lock per station to prevent race-condition double bookings
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

-- 5. Strengthen create_spot_booking so admins also respect global booking_enabled = false
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
  v_booking_enabled BOOLEAN;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please log in as an administrator.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrative privileges required to create spot bookings.';
  END IF;

  v_booking_enabled := public.get_boolean_app_setting('booking_enabled', true);
  IF NOT v_booking_enabled THEN
    RAISE EXCEPTION 'Bookings are temporarily unavailable. Please try again later.';
  END IF;

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

  PERFORM pg_advisory_xact_lock(hashtext(p_station_id::text));

  UPDATE public.bookings
  SET status = 'expired'
  WHERE station_id = p_station_id
    AND status = 'pending_payment'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= now();

  v_end_at := p_start_at + make_interval(mins => p_duration_minutes);

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

-- 6. Create Supabase Storage bucket 'avatars' and scoped RLS policies idempotently
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true,
      5242880,
      ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
    CREATE POLICY "Avatar images are publicly readable"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Users can upload own avatar image" ON storage.objects;
    CREATE POLICY "Users can upload own avatar image"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

    DROP POLICY IF EXISTS "Users can update own avatar image" ON storage.objects;
    CREATE POLICY "Users can update own avatar image"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

    DROP POLICY IF EXISTS "Users can delete own avatar image" ON storage.objects;
    CREATE POLICY "Users can delete own avatar image"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END
$$;

-- 7. Enable Supabase Realtime publication on public.app_settings idempotently
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

