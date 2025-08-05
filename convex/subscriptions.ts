import { v } from "convex/values";
import { query } from "./_generated/server";

export const getUserSubscrption = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) {
      return null;
    }

    const subscription = user.currentSubscriptionId
      ? await ctx.db.get(user.currentSubscriptionId)
      : null;

    if (!subscription) {
      return null;
    }

    return subscription;
  },
});
