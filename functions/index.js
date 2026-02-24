const functions = require("firebase-functions");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");

const stripeSecret = defineString("STRIPE_SECRET");
const adminApp = admin.initializeApp();

exports.createStripeCheckout = functions.https.onRequest((req, res) => {
  const stripe = require("stripe")(stripeSecret.value());
  const cors = require("cors")({ origin: true });
  
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { items, success_url, cancel_url, customer_email } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: items.map((item) => ({
          price_data: {
            currency: "zar",
            product_data: {
              name: item.name,
            },
            unit_amount: Math.round(item.price * 100), // Amount in cents
          },
          quantity: item.quantity,
        })),
        mode: "payment",
        success_url: success_url,
        cancel_url: cancel_url,
        customer_email: customer_email,
      });

      res.status(200).json({ id: session.id });
    } catch (error) {
      console.error("Stripe Error:", error);
      res.status(500).send({ error: error.message });
    }
  });
});
