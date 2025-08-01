import Stripe from "stripe";

// This is the stripe instance that we will use to create customers, subscriptions, etc.
// This is a singleton, so we only need to create one instance and use it throughout the application.
// This is a good practice because it allows us to easily access the stripe instance from anywhere in the convex server.

// If you put the stripe instance outside the convex folder,
// convex will not be able to access it.aka, the stripe instance exists on clientside
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});
