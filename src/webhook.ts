import { saveOrder } from './db';
import type { Env } from './types';

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  const valid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return new Response('Invalid signature', { status: 401 });

  const event = JSON.parse(rawBody);
  if (event.type !== 'checkout.session.completed') return new Response('OK', { status: 200 });

  const s = event.data.object;
  const addr = s.shipping_details?.address ?? s.customer_details?.address ?? {};

  try {
    await saveOrder(env.DB, {
      id: s.id,
      created_at: new Date().toISOString(),
      status: 'pending',
      customer_email: s.customer_details?.email ?? '',
      customer_name: s.customer_details?.name ?? null,
      customer_phone: s.customer_details?.phone ?? null,
      address_line1: addr.line1 ?? null,
      address_line2: addr.line2 ?? null,
      address_city: addr.city ?? null,
      address_state: addr.state ?? null,
      address_postal: addr.postal_code ?? null,
      amount_total: s.amount_total ?? 0,
      client_ref: s.client_reference_id ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE constraint')) return new Response('OK', { status: 200 });
    throw e;
  }

  return new Response('OK', { status: 200 });
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
    const timestamp = parts['t'];
    const sig = parts['v1'];
    if (!timestamp || !sig) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const computed = await crypto.subtle.sign(
      'HMAC', key,
      new TextEncoder().encode(`${timestamp}.${payload}`),
    );
    const hex = Array.from(new Uint8Array(computed))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hex === sig;
  } catch {
    return false;
  }
}
