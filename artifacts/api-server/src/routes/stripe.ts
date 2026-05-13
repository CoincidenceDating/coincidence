import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient.js";

const router: IRouter = Router();

router.post("/stripe/checkout", async (req, res) => {
  const { userId, type, quantity } = req.body as {
    userId: string;
    type: "strings" | "who_liked_me";
    quantity?: number;
  };

  if (!userId || !type) {
    res.status(400).json({ error: "userId and type are required" });
    return;
  }

  let priceId: string | undefined;
  try {
    let rows: Array<{ price_id: unknown }>;
    if (type === "strings") {
      const result = await db.execute(
        sql`SELECT pr.id AS price_id
            FROM stripe.products p
            JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
            WHERE p.active = true
              AND p.metadata->>'type' = ${type}
              AND p.metadata->>'quantity' = ${String(quantity ?? 0)}
            LIMIT 1`,
      );
      rows = result.rows as Array<{ price_id: unknown }>;
    } else {
      const result = await db.execute(
        sql`SELECT pr.id AS price_id
            FROM stripe.products p
            JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
            WHERE p.active = true
              AND p.metadata->>'type' = ${type}
            LIMIT 1`,
      );
      rows = result.rows as Array<{ price_id: unknown }>;
    }

    priceId = rows[0]?.price_id as string | undefined;
  } catch (err) {
    req.log.error({ err }, "Failed to query stripe prices");
    res.status(503).json({ error: "Price lookup unavailable — Stripe not yet set up" });
    return;
  }

  if (!priceId) {
    res.status(404).json({ error: "Price not found — run the seed-products script first" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = `https://${domain}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/?payment_success=1`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        userId,
        type,
        quantity: String(quantity ?? 0),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Failed to create Stripe checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
