import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const recordPurchase = mutation({
  args: {
    userId: v.id("users"),
    courseId: v.id("courses"),
    amount: v.number(),
    stripePurchaseId: v.string(),
  },
  handler: async (ctx, args) => {
    const purchaseId = await ctx.db.insert("purchases", {
      userId: args.userId,
      courseId: args.courseId,
      amount: args.amount,
      purchaseDate: Date.now(),
      stripePurchaseId: args.stripePurchaseId,
    });

    return purchaseId;
  },
});
