/**
 * OLIVEAL GAMING ZONE — RAZORPAY STANDARD CHECKOUT HELPER
 * Lazily loads https://checkout.razorpay.com/v1/checkout.js and wraps the modal
 * lifecycle into a single-settlement Promise for both web and Capacitor Android.
 */

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptLoadPromise = null;

/**
 * Loads the official Razorpay Checkout SDK script once per session.
 */
export function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout requires a browser environment.'));
  }

  if (typeof window.Razorpay === 'function') {
    return Promise.resolve(window.Razorpay);
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        if (typeof window.Razorpay === 'function') {
          resolve(window.Razorpay);
        } else {
          scriptLoadPromise = null;
          reject(new Error('Razorpay SDK loaded without checkout constructor.'));
        }
      });
      existing.addEventListener('error', () => {
        scriptLoadPromise = null;
        reject(new Error('Unable to load Razorpay payment gateway. Please check your internet connection.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      if (typeof window.Razorpay === 'function') {
        resolve(window.Razorpay);
      } else {
        scriptLoadPromise = null;
        reject(new Error('Razorpay payment SDK failed to initialize.'));
      }
    };

    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Unable to load Razorpay payment gateway. Please check your internet connection.'));
    };

    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Opens Razorpay Checkout modal and resolves with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
 * or rejects with an Error annotated with `.code` (`CHECKOUT_DISMISSED` | `PAYMENT_FAILED`).
 */
export async function openRazorpayCheckout({
  keyId,
  orderId,
  amountPaise,
  currency = 'INR',
  name = 'Oliveal Gaming Zone',
  description = 'Station Slot Booking',
  prefill = {},
  notes = {},
  themeColor = '#7C3AED',
}) {
  const RazorpayConstructor = await loadRazorpayScript();

  if (!keyId || !orderId || !amountPaise) {
    throw new Error('Missing Razorpay order details. Please try again.');
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let lastFailureMessage = null;

    const finishResolve = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    const finishReject = (message, code) => {
      if (settled) return;
      settled = true;
      const err = new Error(message);
      err.code = code;
      reject(err);
    };

    const rzp = new RazorpayConstructor({
      key: keyId,
      amount: Number(amountPaise),
      currency,
      name,
      description,
      order_id: orderId,
      prefill: {
        name: prefill.name || '',
        email: prefill.email || '',
        contact: prefill.contact || '',
      },
      notes,
      theme: {
        color: themeColor,
      },
      handler: (response) => {
        finishResolve({
          razorpay_order_id: response?.razorpay_order_id || orderId,
          razorpay_payment_id: response?.razorpay_payment_id,
          razorpay_signature: response?.razorpay_signature,
        });
      },
      modal: {
        escape: true,
        confirm_close: true,
        ondismiss: () => {
          if (lastFailureMessage) {
            finishReject(lastFailureMessage, 'PAYMENT_FAILED');
          } else {
            finishReject('Payment was cancelled before completion. Your time slot has been released.', 'CHECKOUT_DISMISSED');
          }
        },
      },
    });

    if (typeof rzp.on === 'function') {
      rzp.on('payment.failed', (failureEvent) => {
        lastFailureMessage =
          failureEvent?.error?.description ||
          failureEvent?.error?.reason ||
          'Payment failed. Please retry or use another payment method.';
      });
    }

    rzp.open();
  });
}

