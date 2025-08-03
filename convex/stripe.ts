import Stripe from "stripe";
import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { ratelimit } from "./ratelimit";

// This is the stripe instance that we will use to create customers, subscriptions, etc.
// This is a singleton, so we only need to create one instance and use it throughout the application.
// This is a good practice because it allows us to easily access the stripe instance from anywhere in the convex server.

// If you put the stripe instance outside the convex folder,
// convex will not be able to access it.aka, the stripe instance exists on clientside
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

// Function to create the checkout session
// This will be an action because we are using it to connect to a third party service, such as stripe
export const createCheckoutSession = action({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args): Promise<{ checkoutUrl: string | null }> => {
    // Check for authentication first
    const identity = await ctx.auth.getUserIdentity(); // get the user identity from clerk
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Since we are in Action, we can use runQuery to get the user
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject, // this is the id of the clerk user
    });

    if (!user) {
      throw new ConvexError("User not found");
    }

    // TODO: Immplement rate limiting (a nice to have feature), to avoid someone spamming the checkout page to stripe
    const rateLimitKey = `checkout-rate-limit:${user._id}`;
    const { success, reset } = await ratelimit.limit(rateLimitKey);

    if (!success) {
      throw new ConvexError(
        `Rate limit exceeded. Try again in ${reset} seconds.`
      );
    }

    // Get the course
    const course = await ctx.runQuery(api.courses.getCourseById, {
      courseId: args.courseId,
    });

    if (!course) {
      throw new ConvexError("Course not found");
    }

    // Create a session, aka a one-time payment page with the stripe
    const session = (await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              images: [course.imageUrl],
            },
            unit_amount: Math.round(course.price * 100), // price in cents
          },
          quantity: 1,
        },
      ], // This is what you are selling
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${args.courseId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses`,
      metadata: {
        // Metadata is used to store additional information about the session
        courseId: args.courseId,
        userId: user._id,
      },
    })) as Stripe.Checkout.Session;

    return { checkoutUrl: session.url };
  },
});
