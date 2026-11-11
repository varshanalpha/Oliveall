import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/cors.ts';
import { getRazorpayCredentials, verifyHmacSha256Hex } from '../_shared/razorpay.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase runtime secrets are missing.');
    }

    const { webhookSecret } = getRazorpayCredentials();
    if (!webhookSecret) {
      return jsonResponse({ error: 'RAZORPAY_WEBHOOK_SECRET is not configured.' }, 500);
    }

    const signature = req.headers.get('x-razorpay-signature') || '';
    const rawBody = await req.text();

    const isValid = await verifyHmacSha256Hex(rawBody, webhookSecret, signature);
    if (!isValid) {
      return jsonResponse({ error: 'Invalid Razorpay webhook signature.' }, 401);
    }

    const event = JSON.parse(rawBody);
    const eventName = String(event?.event || '');
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;

    const orderId = String(paymentEntity?.order_id || orderEntity?.id || '').trim();
    const paymentId = String(paymentEntity?.id || '').trim();

    if (!orderId) {
      return jsonResponse({ received: true, ignored: 'missing_order_id' });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingPayment, error: lookupErr } = await adminClient
      .from('payments')
      .select('id, booking_id, amount_paise, status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (lookupErr || !existingPayment) {
      return jsonResponse({ received: true, ignored: 'payment_not_found' });
    }

    if (eventName === 'payment.captured' || eventName === 'order.paid') {
      if (!paymentId) {
        return jsonResponse({ received: true, ignored: 'missing_payment_id' });
      }

      const amountPaise = Number(paymentEntity?.amount || orderEntity?.amount_paid || existingPayment.amount_paise);

      const { error: confirmErr } = await adminClient.rpc('confirm_booking_payment', {
        p_booking_id: existingPayment.booking_id,
        p_razorpay_order_id: orderId,
        p_razorpay_payment_id: paymentId,
        p_razorpay_signature: null,
        p_amount_paise: amountPaise,
        p_payment_method: paymentEntity?.method || null,
        p_raw_payload: event,
      });

      if (confirmErr) {
        console.error('Webhook confirm_booking_payment error:', confirmErr);
        return jsonResponse({ error: confirmErr.message }, 500);
      }

      return jsonResponse({ received: true, handled: eventName, status: 'confirmed' });
    }

    if (eventName === 'payment.failed') {
      const reason =
        paymentEntity?.error_description ||
        paymentEntity?.error_reason ||
        'payment_failed';

      await adminClient.rpc('mark_payment_failed', {
        p_razorpay_order_id: orderId,
        p_razorpay_payment_id: paymentId || null,
        p_failure_reason: reason,
        p_raw_payload: event,
      });

      return jsonResponse({ received: true, handled: eventName, status: 'failed' });
    }

    return jsonResponse({ received: true, ignored: eventName });
  } catch (err) {
    console.error('razorpay-webhook error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Webhook processing failed.' },
      500,
    );
  }
});

