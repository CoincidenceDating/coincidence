import type Stripe from 'stripe';
import { getStripeCredentials, getStripeSync, getUncachableStripeClient } from './stripeClient.js';
import { logger } from './lib/logger.js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function updateUserAfterPayment(session: Stripe.Checkout.Session): Promise<void> {
  const meta = (session.metadata ?? {}) as Record<string, string>;
  const { userId, type, quantity } = meta;

  if (!userId || !type) {
    logger.warn({ sessionId: session.id }, 'Webhook: missing userId or type in session metadata');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logger.error('Webhook: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    return;
  }

  const authHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  if (type === 'strings') {
    const qty = Math.max(0, Number(quantity ?? '0'));

    const getResp = await fetch(
      `${SUPABASE_URL}/rest/v1/user_boosts?user_id=eq.${encodeURIComponent(userId)}&select=credits`,
      { headers: authHeaders },
    );
    const rows = (await getResp.json()) as Array<{ credits: number }>;
    const current = rows[0]?.credits ?? 0;

    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/user_boosts`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: userId, credits: current + qty }),
    });

    if (!upsertResp.ok) {
      const text = await upsertResp.text();
      logger.error({ userId, qty, status: upsertResp.status, body: text }, 'Webhook: failed to update user_boosts');
    } else {
      logger.info({ userId, qty, newCredits: current + qty }, 'Webhook: strings added to user_boosts');
    }

  } else if (type === 'who_liked_me') {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/who_liked_access`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: userId, expires_at: expiresAt }),
    });

    if (!upsertResp.ok) {
      const text = await upsertResp.text();
      logger.error({ userId, status: upsertResp.status, body: text }, 'Webhook: failed to update who_liked_access');
    } else {
      logger.info({ userId, expiresAt }, 'Webhook: who_liked_me access granted');
    }
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const { webhookSecret } = await getStripeCredentials();
    const stripe = await getUncachableStripeClient();

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret ?? '');

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    if (event.type === 'checkout.session.completed') {
      await updateUserAfterPayment(event.data.object as Stripe.Checkout.Session);
    }
  }
}
