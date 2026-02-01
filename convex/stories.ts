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

    // Fetch muted story users for current user
    const muted = await ctx.db
      .query("mutedStories")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    const mutedIds = new Set(muted.map((m) => m.mutedUserId));

    const visibleStories = stories.filter(
      (story) => !mutedIds.has(story.userId),
    );

    if (visibleStories.length === 0) return [];

    // Group by user: pick the latest story per user (one avatar per user)
    const latestByUser = new Map<Id<"users">, (typeof visibleStories)[number]>();
    for (const story of visibleStories) {
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

    // Sort so current user's avatar appears first, then by newest story
    result.sort((a, b) => {
      if (a.isCurrentUser !== b.isCurrentUser) {
        return a.isCurrentUser ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    });

    return result;
  },
});

export const toggleMuteUser = mutation({
  args: { mutedUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("mutedStories")
      .withIndex("by_user_and_muted_user", (q) =>
        q.eq("userId", currentUser._id).eq("mutedUserId", args.mutedUserId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    } else {
      await ctx.db.insert("mutedStories", {
        userId: currentUser._id,
        mutedUserId: args.mutedUserId,
      });
      return true;
    }
  },
});

export const getMutedUsers = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const muted = await ctx.db
      .query("mutedStories")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    return muted.map((m) => m.mutedUserId);
  },
});

export const viewStory = mutation({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const story = await ctx.db.get(args.storyId);
    if (!story) throw new Error("Story not found");

    // Do not record self-views
    if (story.userId === currentUser._id) return;

    const existing = await ctx.db
      .query("storyViews")
      .withIndex("by_viewer_and_story", (q) =>
        q.eq("viewerId", currentUser._id).eq("storyId", args.storyId),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("storyViews", {
        storyId: args.storyId,
        viewerId: currentUser._id,
        createdAt: Date.now(),
      });
    }
  },
});

export const getUserStories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return stories
      .filter((s) => s.createdAt >= cutoff)
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const getViewedStoryIds = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const views = await ctx.db
      .query("storyViews")
      .withIndex("by_viewer", (q) => q.eq("viewerId", currentUser._id))
      .collect();

    return views.map((v) => v.storyId);
  },
});

export const getStoryViews = query({
  args: { storyId: v.id("stories") },
  handler: async (ctx, args) => {
    const views = await ctx.db
      .query("storyViews")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();

    if (views.length === 0) {
      return { count: 0, viewers: [] as any[] };
    }

    const viewerDocs = await Promise.all(
      views.map((v) => ctx.db.get(v.viewerId)),
    );

    const viewers = viewerDocs
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((user) => ({
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        image: user.image,
      }));

    return { count: viewers.length, viewers };
  },
});
