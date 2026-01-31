import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const hideUser = mutation({
  args: { hiddenUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("hiddenUsers")
      .withIndex("by_user_and_hidden_user", (q) =>
        q.eq("userId", currentUser._id).eq("hiddenUserId", args.hiddenUserId)
      )
      .first();

    if (existing) {
      // unhide user
      await ctx.db.delete(existing._id);
      return false;
    } else {
      // hide user
      await ctx.db.insert("hiddenUsers", {
        userId: currentUser._id,
        hiddenUserId: args.hiddenUserId,
      });
      return true;
    }
  },
});

export const getHiddenUsers = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const hiddenUsers = await ctx.db
      .query("hiddenUsers")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    return hiddenUsers.map((h) => h.hiddenUserId);
  },
});
