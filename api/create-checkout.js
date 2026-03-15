// api/create-checkout.js
// Vercel Serverless Function
// Creates a Stripe Checkout Session and returns the redirect URL

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  nda:      2900,  // $29.00 in cents
  freelance:3900,  // $39.00
  privacy:  4900,  // $49.00
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tipo, email, product_name } = req.body;

  if (!PRICES[tipo]) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: product_name,
            description: 'Custom legal document prepared by Safe Legal',
          },
          unit_amount: PRICES[tipo],
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.SITE_URL}/#generator`,
      metadata: { tipo, email },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
};
