# Working with Stripe in Convex

## Setup

1. Copy the Stripe secret key to `.env.local` locally and Convex environment variables
2. Install Stripe package:

```bash
npm install stripe
```

3. Create a `stripe.ts` inside the convex folder (because Convex needs to access it, only files inside the convex folder run on Convex servers)

## Database Schema

### Users Table

```typescript
users: defineTable({
  email: v.string(),
  name: v.string(),
  clerkId: v.string(),
  stripeCustomerId: v.string(),
  currentSubscriptionId: v.optional(v.id("subscriptions")),
})
.index("by_clerk_id", ["clerkId"])
.index("by_stripeCustomer_id", ["stripeCustomerId"]),
```

### Courses Table

```typescript
courses: defineTable({
  title: v.string(),
  description: v.string(),
  imageUrl: v.string(),
  price: v.number(),
}),
```

### Purchases Table

```typescript
purchases: defineTable({
  userId: v.id("users"),
  courseId: v.id("courses"),
  amount: v.number(),
  purchaseDate: v.number(), // unix timestamp
  stripePurchaseId: v.string(), // reference to stripe purchase
}).index("by_user_id_and_course_id", ["userId", "courseId"]),
```

### Subscriptions Table

```typescript
subscriptions: defineTable({
  userId: v.id("users"),
  planType: v.union(v.literal("month"), v.literal("year")),
  currentPeriodStart: v.number(), // unix timestamp
  currentPeriodEnd: v.number(), // unix timestamp
  stripeSubscriptionId: v.string(),
  status: v.string(),
  cancelAtPeriodEnd: v.boolean(),
}).index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),
```

## Implementation Files

### 1. Stripe Client (`convex/stripe.ts`)

```typescript
import Stripe from "stripe";
import { action } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { ratelimit } from "./ratelimit";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

export const createCheckoutSession = action({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args): Promise<{ checkoutUrl: string | null }> => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Get user
    const user = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Rate limiting
    const rateLimitKey = `checkout-rate-limit:${user._id}`;
    const { success, reset } = await ratelimit.limit(rateLimitKey);

    if (!success) {
      throw new ConvexError(
        `Rate limit exceeded. Try again in ${reset} seconds.`
      );
    }

    // Get course
    const course = await ctx.runQuery(api.courses.getCourseById, {
      courseId: args.courseId,
    });

    if (!course) {
      throw new ConvexError("Course not found");
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
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
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${args.courseId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses`,
      metadata: {
        courseId: args.courseId,
        userId: user._id,
      },
    });

    return { checkoutUrl: session.url };
  },
});
```

### 2. User Management (`convex/users.ts`)

```typescript
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    clerkId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      clerkId: args.clerkId,
      stripeCustomerId: args.stripeCustomerId,
    });

    return userId;
  },
});

export const getUserAccess = query({
  args: {
    userId: v.id("users"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check subscription access
    if (user.currentSubscriptionId) {
      const subscription = await ctx.db.get(user.currentSubscriptionId);
      if (subscription && subscription.status === "active") {
        return { hasAccess: true, accessType: "subscription" };
      }
    }

    // Check individual course purchase
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_user_id_and_course_id", (q) =>
        q.eq("userId", args.userId).eq("courseId", args.courseId)
      )
      .unique();

    if (purchase) {
      return { hasAccess: true, accessType: "course" };
    }

    return { hasAccess: false };
  },
});
```

### 3. Clerk Webhook (`convex/http.ts`)

```typescript
export const clerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  // Verify webhook headers
  const svix_id = request.headers.get("svix-id");
  const svix_signature = request.headers.get("svix-signature");
  const svix_timestamp = request.headers.get("svix-timestamp");

  if (!svix_id || !svix_signature || !svix_timestamp) {
    return new Response("Error -- no svix headers", { status: 400 });
  }

  // Verify webhook
  const payload = await request.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(webhookSecret);

  try {
    const evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-signature": svix_signature,
      "svix-timestamp": svix_timestamp,
    }) as WebhookEvent;

    // Handle user.created event
    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const email = email_addresses[0].email_address;
      const name = `${first_name || ""} ${last_name || ""}`.trim();
      const clerkId = id;

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          clerkId: id,
        },
      });

      // Create user in database
      await ctx.runMutation(api.users.createUser, {
        email,
        name,
        clerkId,
        stripeCustomerId: customer.id,
      });
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    return new Response("Error -- webhook verification failed", {
      status: 400,
    });
  }
});
```

## Client-Side Usage

### Purchase Button Component

```typescript
"use client";
import { useAction } from "convex/react";

export default function PurchaseButton({ courseId }: { courseId: Id<"courses"> }) {
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  const handlePurchase = async () => {
    try {
      const { checkoutUrl } = await createCheckoutSession({ courseId });
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error("Purchase failed:", error);
    }
  };

  return (
    <Button onClick={handlePurchase}>
      Enroll Now
    </Button>
  );
}
```

## Environment Variables

### Local (.env.local)

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CLERK_WEBHOOK_SECRET=whsec_...
```

### Convex Dashboard

```bash
STRIPE_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

## Payment Flow

1. **User clicks "Enroll Now"** → Calls `createCheckoutSession`
2. **Rate limiting check** → Prevents spam
3. **Stripe checkout session created** → Returns checkout URL
4. **User redirected to Stripe** → Completes payment
5. **Success redirect** → Back to your app with session_id
6. **Webhook processing** → Updates database with purchase

## Access Control

- **Subscription access**: Check if user has active subscription
- **Individual course access**: Check if user purchased specific course
- **Real-time updates**: Convex provides live data updates
