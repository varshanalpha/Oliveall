import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts';
import {
  buildBasicAuthHeader,
  getRazorpayCredentials,
  verifyHmacSha256Hex,
} from '../_shared/razorpay.ts';

interface VerifyPaymentBody {
  bookingId?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
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
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return jsonResponse({ error: 'Session expired. Please log in again.' }, 401);
    }

    const body = (await req.json()) as VerifyPaymentBody;
    const bookingId = body?.bookingId?.trim();
    const orderId = body?.razorpay_order_id?.trim();
    const paymentId = body?.razorpay_payment_id?.trim();
    const signature = body?.razorpay_signature?.trim();

    if (!bookingId || !orderId || !paymentId || !signature) {
      return jsonResponse({ error: 'Missing Razorpay verification parameters.' }, 400);
    }

    const { keyId, keySecret } = getRazorpayCredentials();

    // 1. Cryptographically verify Razorpay Checkout signature: order_id + "|" + payment_id
    const signatureValid = await verifyHmacSha256Hex(
      `${orderId}|${paymentId}`,
      keySecret,
      signature,
    );

    if (!signatureValid) {
      return jsonResponse({ error: 'Invalid payment signature. Booking not confirmed.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Verify order ownership belongs to this user and booking
    const { data: existingPayment, error: paymentLookupErr } = await adminClient
      .from('payments')
      .select('id, booking_id, user_id, amount_paise, currency, status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (paymentLookupErr || !existingPayment) {
      return jsonResponse({ error: 'Payment order not found.' }, 404);
    }

    if (existingPayment.booking_id !== bookingId || existingPayment.user_id !== userData.user.id) {
      return jsonResponse({ error: 'Payment record does not match the signed-in booking.' }, 403);
    }

    // 3. Query Razorpay Payments API directly to verify status & amount (and capture if authorized)
    const authBasic = buildBasicAuthHeader(keyId, keySecret);
    const paymentFetchRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: { Authorization: authBasic },
    });

    let paymentData = await paymentFetchRes.json();
    if (!paymentFetchRes.ok || !paymentData?.id) {
      return jsonResponse(
        { error: paymentData?.error?.description || 'Unable to verify payment with Razorpay.' },
        502,
      );
    }

    if (paymentData.order_id && paymentData.order_id !== orderId) {
      return jsonResponse({ error: 'Razorpay payment does not match order ID.' }, 400);
    }

    if (Number(paymentData.amount) !== Number(existingPayment.amount_paise)) {
      return jsonResponse({ error: 'Paid amount does not match booking total.' }, 400);
    }

    if (paymentData.status === 'authorized') {
      const captureRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: authBasic,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: existingPayment.amount_paise,
            currency: existingPayment.currency || 'INR',
          }),
        },
      );
      const capturePayload = await captureRes.json();
      if (!captureRes.ok || capturePayload?.status !== 'captured') {
        return jsonResponse(
          { error: capturePayload?.error?.description || 'Payment capture failed.' },
          400,
        );
      }
      paymentData = capturePayload;
    }

    if (paymentData.status !== 'captured') {
      return jsonResponse(
        { error: `Payment status is "${paymentData.status}", expected "captured".` },
        400,
      );
    }

    // 4. Atomically confirm booking & mark payment captured in Postgres
    const { data: confirmResult, error: confirmError } = await adminClient.rpc('confirm_booking_payment', {
      p_booking_id: bookingId,
      p_razorpay_order_id: orderId,
      p_razorpay_payment_id: paymentId,
      p_razorpay_signature: signature,
      p_amount_paise: Number(paymentData.amount),
      p_payment_method: paymentData.method || null,
      p_raw_payload: paymentData,
    });

    if (confirmError || !confirmResult?.booking) {
      const msg = confirmError?.message || 'Unable to confirm booking after payment.';
      const status = msg.toLowerCase().includes('claimed') ? 409 : 400;
      return jsonResponse({ error: msg }, status);
    }

    return jsonResponse({
      verified: true,
      booking: confirmResult.booking,
      station: confirmResult.station,
      payment: confirmResult.payment,
      alreadyConfirmed: Boolean(confirmResult.already_confirmed),
    });
  } catch (err) {
    console.error('verify-razorpay-payment error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Payment verification failed.' },
      500,
    );
  }
});

