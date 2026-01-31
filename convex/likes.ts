import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const getPostLikes = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    if (likes.length === 0) return [];

    const likerIds = likes.map((like) => like.userId);

    const users = await Promise.all(likerIds.map((id) => ctx.db.get(id)));

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", currentUser._id))
      .collect();

    const followingSet = new Set(follows.map((f) => f.followingId));

    return users
      .filter((user): user is NonNullable<typeof user> => !!user)
      .map((user) => ({
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        image: user.image,
        bio: user.bio,
        isFollowing: followingSet.has(user._id),
      }));
  },
});
