import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";
import { Id } from "./_generated/dataModel";

// Generate upload URL for story images
export const generateUploadUrl = mutation(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  return await ctx.storage.generateUploadUrl();
});

// Create a new story for the current user
export const createStory = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error("Image not found");

    await ctx.db.insert("stories", {
      userId: currentUser._id,
      imageUrl,
      storageId: args.storageId,
      createdAt: Date.now(),
    });
  },
});

// Get active stories from the last 24 hours, grouped by user
export const getStories = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h

    const stories = await ctx.db
      .query("stories")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", cutoff))
      .order("desc")
      .collect();

    if (stories.length === 0) return [];

    // Keep the latest story per user
    const latestByUser = new Map<Id<"users">, (typeof stories)[number]>();
    for (const story of stories) {
      if (!latestByUser.has(story.userId)) {
        latestByUser.set(story.userId, story);
      }
    }

    const userIds = Array.from(latestByUser.keys());
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));

    const result = userIds
      .map((userId, index) => {
        const user = users[index];
        const story = latestByUser.get(userId)!;
        if (!user) return null;

        const isCurrentUser = user._id === currentUser._id;

        return {
          _id: story._id,
          userId: user._id,
          imageUrl: story.imageUrl,
          createdAt: story.createdAt,
          username: isCurrentUser ? "You" : user.username,
          avatar: user.image,
          hasStory: true,
          isCurrentUser,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort so current user's story ("You") appears first
    result.sort((a, b) => {
      if (a.isCurrentUser === b.isCurrentUser) return 0;
      return a.isCurrentUser ? -1 : 1;
    });

    return result;
  },
});
