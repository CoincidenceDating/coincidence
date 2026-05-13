import { getUncachableStripeClient } from "./stripeClient.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";

async function registerWebhook() {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) {
    logger.warn("REPLIT_DOMAINS not set — skipping webhook registration");
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const webhookUrl = `https://${domain}/api/stripe/webhook`;

    // Check if a webhook endpoint for this URL already exists
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    const already = existing.data.find((e) => e.url === webhookUrl);
    if (already) {
      logger.info({ webhookUrl }, "Stripe webhook already registered");
      return;
    }

    await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: ["checkout.session.completed"],
    });
    logger.info({ webhookUrl }, "Stripe webhook registered");
    logger.warn(
      "Set STRIPE_WEBHOOK_SECRET to the signing secret shown in the Stripe dashboard for this endpoint."
    );
  } catch (err: unknown) {
    logger.warn({ err }, "Stripe webhook registration failed (non-fatal)");
  }
}

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Register webhook in background — don't block server startup
registerWebhook().catch((err: unknown) => {
  logger.warn({ err }, "registerWebhook error");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
