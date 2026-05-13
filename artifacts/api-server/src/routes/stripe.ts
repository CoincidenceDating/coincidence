import { Router, type IRouter } from "express";
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

  try {
    const stripe = await getUncachableStripeClient();

    // Look up the product by metadata directly from the Stripe API
    const query =
      type === "strings"
        ? `active:'true' AND metadata['type']:'strings' AND metadata['quantity']:'${Number(quantity ?? 1)}'`
        : `active:'true' AND metadata['type']:'who_liked_me'`;

    const products = await stripe.products.search({ query, limit: 1 });

    if (!products.data.length) {
      req.log.error({ type, quantity }, "No Stripe product found for this type");
      res.status(404).json({ error: "Product not found — run the seed-products script first" });
      return;
    }

    const productId = products.data[0].id;
    const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });

    if (!prices.data.length) {
      req.log.error({ productId }, "No active price found for product");
      res.status(404).json({ error: "No active price found for this product" });
      return;
    }

    const priceId = prices.data[0].id;
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
  } catch (err: unknown) {
    req.log.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
