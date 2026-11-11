-- ==============================================================================
-- OLIVEAL GAMING ZONE — RAZORPAY ONLINE PAYMENTS & ATOMIC HOLD CONFIRMATION
-- ==============================================================================
-- Safe & idempotent: compatible with 01..06 migrations.
-- Creates public.payments, protects direct confirmed booking inserts via RLS,
-- updates create_customer_booking() to issue a 10-minute 'pending_payment' hold,
-- and adds server-side confirmation/release/failure RPCs.
-- ==============================================================================

-- 1. PAYMENTS LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  amount_inr NUMERIC(10, 2) GENERATED ALWAYS AS (ROUND(amount_paise / 100.0, 2)) STORED,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (
    status IN ('created', 'authorized', 'captured', 'failed', 'refunded')
  ),
  payment_method TEXT,
  failure_reason TEXT,
  verified_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON public.payments (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status_verified
  ON public.payments (status, verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user_created
  ON public.payments (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable strict Row-Level Security on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payments, Admins view all" ON public.payments;
CREATE POLICY "Users view own payments, Admins view all"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Prevent direct client inserts of pre-confirmed online bookings;
-- Customers only insert 'confirmed' via Edge Function verification RPC.
DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users create own pending holds" ON public.bookings;
CREATE POLICY "Users create own pending holds"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending_payment');

-- ==============================================================================
-- 2. UPDATE create_customer_booking() TO ISSUE A 10-MINUTE PAYMENT HOLD
-- ==============================================================================
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

  -- Transaction-scoped lock per station to prevent race-condition double holds
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

  -- Check half-open interval overlap [start_at, end_at) against confirmed bookings & active holds
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
    terms_accepted,
    hold_expires_at,
    booking_source
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
    'pending_payment',
    true,
    timezone('utc'::text, now()) + interval '10 minutes',
    'online'
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

-- ==============================================================================
-- 3. RELEASE ABANDONED OR CANCELLED PENDING PAYMENT HOLD IMMEDIATELY
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.release_pending_booking_hold(
  p_booking_id UUID,
  p_reason TEXT DEFAULT 'checkout_cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
  v_booking public.bookings%ROWTYPE;
  v_clean_reason TEXT;
BEGIN
  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking ID is required.';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'released', false,
      'booking_id', p_booking_id,
      'status', 'not_found'
    );
  END IF;

  v_caller := auth.uid();
  IF v_caller IS NOT NULL THEN
    IF v_booking.user_id IS DISTINCT FROM v_caller AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permission denied to release this booking hold.';
    END IF;
  END IF;

  v_clean_reason := COALESCE(NULLIF(trim(p_reason), ''), 'checkout_cancelled');

  IF v_booking.status = 'pending_payment' THEN
    UPDATE public.bookings
    SET
      status = 'expired',
      hold_expires_at = timezone('utc'::text, now())
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    UPDATE public.payments
    SET
      status = 'failed',
      failure_reason = COALESCE(NULLIF(failure_reason, ''), v_clean_reason)
    WHERE booking_id = p_booking_id
      AND status IN ('created', 'authorized');

    RETURN jsonb_build_object(
      'released', true,
      'booking_id', v_booking.id,
      'status', v_booking.status
    );
  END IF;

  RETURN jsonb_build_object(
    'released', false,
    'booking_id', v_booking.id,
    'status', v_booking.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_pending_booking_hold(UUID, TEXT)
  TO authenticated, service_role;

-- ==============================================================================
-- 4. CONFIRM BOOKING & RECORD CAPTURED PAYMENT (SERVICE ROLE ONLY)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_booking_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT DEFAULT NULL,
  p_amount_paise INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_station public.stations%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_expected_paise INTEGER;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_conflict_exists BOOLEAN;
BEGIN
  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking ID is required.';
  END IF;

  IF NULLIF(trim(COALESCE(p_razorpay_order_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Razorpay order ID is required.';
  END IF;

  IF NULLIF(trim(COALESCE(p_razorpay_payment_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Razorpay payment ID is required.';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking record not found.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_booking.station_id::text));

  SELECT * INTO v_station
  FROM public.stations
  WHERE id = v_booking.station_id;

  v_expected_paise := ROUND(v_booking.total_amount * 100)::INTEGER;
  IF p_amount_paise IS NOT NULL AND p_amount_paise <> v_expected_paise THEN
    RAISE EXCEPTION 'Payment amount mismatch. Expected % paise, received % paise.',
      v_expected_paise, p_amount_paise;
  END IF;

  -- Idempotent return if this payment was already captured for this booking
  SELECT * INTO v_payment
  FROM public.payments
  WHERE razorpay_order_id = p_razorpay_order_id
  FOR UPDATE;

  IF v_booking.status = 'confirmed'
     AND FOUND
     AND v_payment.status = 'captured'
     AND (v_payment.razorpay_payment_id IS NULL OR v_payment.razorpay_payment_id = p_razorpay_payment_id)
  THEN
    RETURN jsonb_build_object(
      'booking', to_jsonb(v_booking),
      'station', to_jsonb(v_station),
      'payment', to_jsonb(v_payment),
      'already_confirmed', true
    );
  END IF;

  IF v_booking.status NOT IN ('pending_payment', 'expired') THEN
    RAISE EXCEPTION 'Booking cannot be confirmed in status: %.', v_booking.status;
  END IF;

  -- Ensure no other confirmed booking or active hold claimed the interval
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.station_id = v_booking.station_id
      AND b.id <> v_booking.id
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(v_booking.start_at, v_booking.end_at, '[)')
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
    RAISE EXCEPTION 'This time slot was claimed before payment completed. Please contact support for a refund.';
  END IF;

  UPDATE public.bookings
  SET
    status = 'confirmed',
    hold_expires_at = NULL
  WHERE id = v_booking.id
  RETURNING * INTO v_booking;

  INSERT INTO public.payments (
    booking_id,
    user_id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount_paise,
    currency,
    status,
    payment_method,
    failure_reason,
    verified_at,
    raw_payload
  )
  VALUES (
    v_booking.id,
    v_booking.user_id,
    p_razorpay_order_id,
    p_razorpay_payment_id,
    NULLIF(trim(COALESCE(p_razorpay_signature, '')), ''),
    COALESCE(p_amount_paise, v_expected_paise),
    'INR',
    'captured',
    NULLIF(trim(COALESCE(p_payment_method, '')), ''),
    NULL,
    v_now,
    COALESCE(p_raw_payload, '{}'::jsonb)
  )
  ON CONFLICT (razorpay_order_id) DO UPDATE
  SET
    razorpay_payment_id = EXCLUDED.razorpay_payment_id,
    razorpay_signature = COALESCE(EXCLUDED.razorpay_signature, public.payments.razorpay_signature),
    status = 'captured',
    payment_method = COALESCE(EXCLUDED.payment_method, public.payments.payment_method),
    failure_reason = NULL,
    verified_at = COALESCE(public.payments.verified_at, EXCLUDED.verified_at),
    raw_payload = CASE
      WHEN EXCLUDED.raw_payload IS NOT NULL AND EXCLUDED.raw_payload <> '{}'::jsonb
        THEN EXCLUDED.raw_payload
      ELSE public.payments.raw_payload
    END
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object(
    'booking', to_jsonb(v_booking),
    'station', to_jsonb(v_station),
    'payment', to_jsonb(v_payment),
    'already_confirmed', false
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time slot was claimed before payment completed. Please contact support for a refund.';
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_payment(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB)
  TO service_role;

-- ==============================================================================
-- 5. MARK PAYMENT FAILED & EXPIRE UNPAID HOLD (SERVICE ROLE ONLY)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.mark_payment_failed(
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT 'payment_failed',
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF NULLIF(trim(COALESCE(p_razorpay_order_id, '')), '') IS NULL THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'missing_order_id');
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE razorpay_order_id = p_razorpay_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'payment_not_found');
  END IF;

  -- Never downgrade a captured payment
  IF v_payment.status = 'captured' THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'already_captured');
  END IF;

  UPDATE public.payments
  SET
    status = 'failed',
    razorpay_payment_id = COALESCE(NULLIF(trim(COALESCE(p_razorpay_payment_id, '')), ''), public.payments.razorpay_payment_id),
    failure_reason = COALESCE(NULLIF(trim(COALESCE(p_failure_reason, '')), ''), 'payment_failed'),
    raw_payload = CASE
      WHEN p_raw_payload IS NOT NULL AND p_raw_payload <> '{}'::jsonb
        THEN p_raw_payload
      ELSE public.payments.raw_payload
    END
  WHERE id = v_payment.id
  RETURNING * INTO v_payment;

  UPDATE public.bookings
  SET
    status = 'expired',
    hold_expires_at = timezone('utc'::text, now())
  WHERE id = v_payment.booking_id
    AND status = 'pending_payment';

  RETURN jsonb_build_object(
    'updated', true,
    'payment', to_jsonb(v_payment)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payment_failed(TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payment_failed(TEXT, TEXT, TEXT, JSONB)
  TO service_role;

