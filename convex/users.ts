import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

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
      console.log("User already exists");
      return existingUser._id;
    }

    // This userId is not clerkId, it is the _id generated automatically by convex, with each table entry having a unique _id
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      clerkId: args.clerkId,
      stripeCustomerId: args.stripeCustomerId,
    });

    return userId;
  },
});

// We will just have the clerkId available. So, we can use it to get the user.
export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    return user;
  },
});

export const getUserByStripeCustomerId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripeCustomer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique();
    return user;
  },
});

export const getUserAccess = query({
  args: {
    userId: v.id("users"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity(); // Check if the user is authenticated

    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const user = await ctx.db.get(args.userId); // Get the user entry which matches the userId

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check for an active subscription for all courses
    if (user.currentSubscriptionId) {
      const subscription = await ctx.db.get(user.currentSubscriptionId);

      if (subscription && subscription.status === "active") {
        return { hasAccess: true, accessType: "subscription" };
      }
    }

    // Check for individual course access
    // const
  },
});
