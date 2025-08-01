import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    clerkId: v.string(),
    stripeCustomerId: v.string(),
    currentSubscriptionId: v.optional(v.id("subscriptions")),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_stripeCustomer_id", ["stripeCustomerId"]),

  courses: defineTable({
    title: v.string(),
    description: v.string(),
    imageUrl: v.string(),
    price: v.number(),
  }),

  purchases: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    amount: v.number(),
    purchaseDate: v.number(), // unix timestamp
    stripePurchaseId: v.string(), // reference to stripe purchase
  }).index("by_user_id_and_course_id", ["userId", "courseId"]), // allows us to query by user and course

  // Note compound index and single indexing can be used at the same time with the same fields.

  subscriptions: defineTable({
    userId: v.id("users"),
    planType: v.union(v.literal("month"), v.literal("year")), // This is what we are getting from stripe, keep month and year for matching with stripe
    currentPeriodStart: v.number(), // unix timestamp
    currentPeriodEnd: v.number(), // unix timestamp
    stripeSubscriptionId: v.string(),
    status: v.string(),
    cancelAtPeriodEnd: v.boolean(), // when a user cancels a subscription, we need to know when the subscription will end. Default to false
  }).index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),
});
