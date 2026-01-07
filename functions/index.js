// FILE: /functions/index.js
// ============================================
const functions = require("firebase-functions");
const Stripe = require("stripe");

// Initialize Stripe with the secret key stored in Firebase config
const stripe = new Stripe(functions.config().stripe.secret, {
  apiVersion: "2024-06-20",
});

// HTTPS endpoint: /createPaymentIntent
exports.createPaymentIntent = functions.https.onRequest(async (req, res) => {
  // Allow CORS for mobile (Expo) requests
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { amount, currency } = req.body;
    
    // Validate input
    if (!amount) {
      res.status(400).send({ error: "Amount is required." });
      return;
    }

    // Create PaymentIntent in Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // Stripe expects smallest currency unit
      currency: currency || "usd",
      payment_method_types: ["card"],
    });

    // Respond with clientSecret for frontend
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).send({ error: error.message });
  }
});