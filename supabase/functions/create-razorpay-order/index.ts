import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts';
import { buildBasicAuthHeader, getRazorpayCredentials } from '../_shared/razorpay.ts';

interface CreateOrderRequestBody {
  stationId?: string;
  startAt?: string;
  durationMinutes?: number;
  playerCount?: number;
  termsAccepted?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Supabase runtime secrets are missing.');
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Authentication required to initiate payment.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return jsonResponse({ error: 'Your session has expired. Please log in again.' }, 401);
    }

    const body = (await req.json()) as CreateOrderRequestBody;
    if (!body?.stationId || !body?.startAt || !body?.durationMinutes || !body?.playerCount) {
      return jsonResponse({ error: 'Missing required booking parameters.' }, 400);
    }

    // 1. Atomically reserve a 10-minute pending_payment hold & derive server pricing
    const { data: holdResult, error: rpcError } = await userClient.rpc('create_customer_booking', {
      p_station_id: body.stationId,
      p_start_at: body.startAt,
      p_duration_minutes: Number(body.durationMinutes),
      p_player_count: Number(body.playerCount),
      p_terms_accepted: Boolean(body.termsAccepted),
    });

    if (rpcError || !holdResult?.booking) {
      const msg = rpcError?.message || 'Unable to reserve selected time slot.';
      const status = msg.toLowerCase().includes('unavailable') ? 409 : 400;
      return jsonResponse({ error: msg }, status);
    }

    const booking = holdResult.booking;
    const station = holdResult.station;
    const amountPaise = Math.round(Number(booking.total_amount) * 100);

    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      await userClient.rpc('release_pending_booking_hold', {
        p_booking_id: booking.id,
        p_reason: 'invalid_amount',
      });
      return jsonResponse({ error: 'Invalid booking amount computed.' }, 400);
    }

    // 2. Create authoritative Razorpay Order via REST API
    const { keyId, keySecret } = getRazorpayCredentials();
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: buildBasicAuthHeader(keyId, keySecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: String(booking.booking_number || booking.id).slice(0, 40),
        notes: {
          booking_id: String(booking.id),
          booking_number: String(booking.booking_number || ''),
          station_id: String(booking.station_id || ''),
          user_id: String(userData.user.id),
        },
      }),
    });

    const rzpPayload = await rzpResponse.json();
    if (!rzpResponse.ok || !rzpPayload?.id) {
      await userClient.rpc('release_pending_booking_hold', {
        p_booking_id: booking.id,
        p_reason: 'razorpay_order_failed',
      });

      const rzpErrMsg =
        rzpPayload?.error?.description ||
        rzpPayload?.error?.reason ||
        'Unable to create Razorpay order.';
      return jsonResponse({ error: rzpErrMsg }, 502);
    }

    // 3. Persist 'created' order row in public.payments with service_role
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: insertPayErr } = await adminClient.from('payments').insert({
      booking_id: booking.id,
      user_id: userData.user.id,
      razorpay_order_id: rzpPayload.id,
      amount_paise: amountPaise,
      currency: 'INR',
      status: 'created',
      raw_payload: rzpPayload,
    });

    if (insertPayErr) {
      await userClient.rpc('release_pending_booking_hold', {
        p_booking_id: booking.id,
        p_reason: 'payment_record_failed',
      });
      return jsonResponse({ error: 'Failed to record payment order.' }, 500);
    }

    return jsonResponse({
      orderId: rzpPayload.id,
      amountPaise,
      currency: 'INR',
      keyId,
      booking,
      station,
    });
  } catch (err) {
    console.error('create-razorpay-order error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Internal payment gateway error.' },
      500,
    );
  }
});

