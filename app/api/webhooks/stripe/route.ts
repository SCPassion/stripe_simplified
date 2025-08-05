import { ConvexHttpClient } from "convex/browser";
import { stripe } from "@/convex/stripe";
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    if (err instanceof Error) {
      console.log("Webhook signature verification failed", err.message);
    } else {
      console.log("Webhook signature verification failed");
    }
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        return new Response("OK", { status: 200 });
      case "charge.updated":
        return new Response("OK", { status: 200 });
      case "payment_intent.succeeded":
        return new Response("OK", { status: 200 });
      case "payment_intent.created":
        return new Response("OK", { status: 200 });
      case "charge.succeeded":
        return new Response("OK", { status: 200 });
      case "payment_intent.payment_failed":
        return new Response("OK", { status: 200 });
      case "payment_intent.canceled":
        return new Response("OK", { status: 200 });
      case "payment_intent.requires_action":
        return new Response("OK", { status: 200 });
      case "invoice.payment_succeeded":
        return new Response("OK", { status: 200 });
      case "invoice.payment_failed":
        return new Response("OK", { status: 200 });
      case "customer.subscription.created":
        return new Response("OK", { status: 200 });
      case "customer.subscription.updated":
        return new Response("OK", { status: 200 });
      case "customer.subscription.deleted":
        return new Response("OK", { status: 200 });
      case "customer.created":
        return new Response("OK", { status: 200 });
      case "customer.updated":
        return new Response("OK", { status: 200 });
      case "customer.deleted":
        return new Response("OK", { status: 200 });
      default:
        console.log(`Unhandled event type ${event.type}`);
        return new Response("Event not handled", { status: 200 });
    }
  } catch (error) {
    console.log("Error processing webhook", error);
    return new Response("Error processing webhook", {
      status: 500,
    });
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const courseId = session.metadata?.courseId; // information is from the metadata field of the checkout session url
  const stripeCustomerId = session.customer as string;

  if (!courseId || !stripeCustomerId) {
    throw new Error("Missing courseId or stripeCustomerId");
  }

  const user = await convex.query(api.users.getUserByStripeCustomerId, {
    stripeCustomerId,
  });

  if (!user) {
    throw new Error("User not found");
  }

  await convex.mutation(api.purchases.recordPurchase, {
    userId: user._id,
    courseId: courseId as Id<"courses">,
    amount: session.amount_total as number,
    stripePurchaseId: session.id,
  });

  // TODO: Send success email to user
  return new Response(null, {
    status: 200,
  });
}
