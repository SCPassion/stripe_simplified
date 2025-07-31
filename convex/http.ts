import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Action is non-atomic, mutation, query, internal action can be executed inside an action
// Action cannot access the db directly, why? Not transactional
export const clerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET; // from convex environment variables
  // use this secret to verify the webhook coming to the server
  // if no webhook secret, throw an error
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  // verify the webhook signature, aka headers
  const svix_id = request.headers.get("svix-id");
  const svix_signature = request.headers.get("svix-signature");
  const svix_timestamp = request.headers.get("svix-timestamp");

  // If any of the svix headers are missing, return a 400 error
  // Basic validation that the request follows the expected format
  if (!svix_id || !svix_signature || !svix_timestamp) {
    return new Response("Error -- no svix headers", { status: 400 });
  }

  // Get the payload from the request body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Verify if the webhook is coming from clerk
  const wh = new Webhook(webhookSecret); // wh stands for webhook
  let evt: WebhookEvent;

  // If try-catch passes, then the webhook is verified
  // aka, the webhook is coming from clerk
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-signature": svix_signature,
      "svix-timestamp": svix_timestamp,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Error -- webhook verification failed: ", error);
    return new Response("Error -- webhook verification failed", {
      status: 400,
    });
  }

  // If the event is coming from clerk, we check for the event type
  const eventType = evt.type;

  // Check if the event is a user.created event
  // These data are coming from the clerk
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0].email_address;
    const name = `${first_name || ""} ${last_name || ""}`.trim();
    const clerkId = id;

    try {
      await ctx.runMutation(api.users.createUser, {
        email,
        name,
        clerkId,
      });

      // TODO: create stripe customer
      // TODO: Send a welcome email to the user
    } catch (err) {
      console.error("Error -- failed to create user: ", err);
      return new Response("Error -- failed to create user", { status: 500 });
    }
  }

  return new Response("Webhook processed successfully", { status: 200 });
});

http.route({
  // This is what you have setup in the clerk webhook settings
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkWebhook,
});

export default http;
