import Stripe from 'stripe';

export async function getStripeCredentials(): Promise<{ secretKey: string }> {
  if (process.env.STRIPE_SECRET_KEY) {
    return { secretKey: process.env.STRIPE_SECRET_KEY };
  }

  // Fallback: Replit connector API
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    const resp = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
      {
        headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (resp.ok) {
      const data = await resp.json() as { items?: Array<{ settings?: { secret_key?: string } }> };
      const key = data.items?.[0]?.settings?.secret_key;
      if (key) return { secretKey: key };
    }
  }

  throw new Error(
    'Stripe not configured. Set STRIPE_SECRET_KEY as a secret.'
  );
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}
