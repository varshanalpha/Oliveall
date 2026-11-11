export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
}

export function getRazorpayCredentials(): RazorpayCredentials {
  const keyId = (
    Deno.env.get('RAZORPAY_KEY_ID') ||
    Deno.env.get('RAZORPAY_TEST_API_KEY') ||
    ''
  ).trim();

  const keySecret = (
    Deno.env.get('RAZORPAY_KEY_SECRET') ||
    Deno.env.get('RAZORPAY_TEST_SECRET_KEY') ||
    ''
  ).trim();

  const webhookSecret = (
    Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ||
    ''
  ).trim() || null;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay server secrets missing. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase Edge Function secrets.'
    );
  }

  return { keyId, keySecret, webhookSecret };
}

export function buildBasicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyHmacSha256Hex(
  payload: string,
  secret: string,
  expectedSignatureHex: string,
): Promise<boolean> {
  if (!payload || !secret || !expectedSignatureHex) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeEqual(computedHex.toLowerCase(), expectedSignatureHex.trim().toLowerCase());
}

