import { getUncachableStripeClient } from './stripeClient.js';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Coincidence products in Stripe...');

  const stringPacks = [
    { label: '1 String',   quantity: 1,  pence: 399  },
    { label: '5 Strings',  quantity: 5,  pence: 1899 },
    { label: '10 Strings', quantity: 10, pence: 3499 },
  ];

  for (const pack of stringPacks) {
    const existing = await stripe.products.search({
      query: `name:'${pack.label}' AND active:'true'`,
    });
    if (existing.data.length > 0) {
      console.log(`  ✓ "${pack.label}" already exists (${existing.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name: pack.label,
      description: `${pack.quantity} string${pack.quantity > 1 ? 's' : ''} for Coincidence — use them to spark connections`,
      metadata: { type: 'strings', quantity: String(pack.quantity) },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.pence,
      currency: 'gbp',
    });

    console.log(`  ✓ Created "${pack.label}" — product: ${product.id}, price: ${price.id}`);
  }

  const wlmExisting = await stripe.products.search({
    query: `name:'Who Liked Me' AND active:'true'`,
  });
  if (wlmExisting.data.length > 0) {
    console.log(`  ✓ "Who Liked Me" already exists (${wlmExisting.data[0].id})`);
  } else {
    const wlmProduct = await stripe.products.create({
      name: 'Who Liked Me',
      description: 'See who already liked you — 24 hour access',
      metadata: { type: 'who_liked_me' },
    });

    const wlmPrice = await stripe.prices.create({
      product: wlmProduct.id,
      unit_amount: 499,
      currency: 'gbp',
    });

    console.log(`  ✓ Created "Who Liked Me" — product: ${wlmProduct.id}, price: ${wlmPrice.id}`);
  }

  console.log('\nAll products ready. Webhooks will sync them to the database automatically.');
}

createProducts().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
