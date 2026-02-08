import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get recent messages (paginated)
export const list = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        return await ctx.db
            .query("messages")
            .withIndex("by_timestamp")
            .order("desc")
            .take(limit);
    },
});

// Get messages by channel
export const getByChannel = query({
    args: {
        channelId: v.id("channels"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        return await ctx.db
            .query("messages")
            .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
            .order("desc")
            .take(limit);
    },
});

// Get messages by conversation
export const getByConversation = query({
    args: {
        conversationId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        return await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .order("desc")
            .take(limit);
    },
});

// Store a new message
export const store = mutation({
    args: {
        channelId: v.id("channels"),
        channelType: v.string(),
        platformMessageId: v.string(),
        conversationId: v.string(),
        senderName: v.string(),
        senderPlatformId: v.string(),
        content: v.string(),
        contentType: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("video"),
            v.literal("audio"),
            v.literal("file"),
            v.literal("location"),
            v.literal("sticker")
        ),
        isOutgoing: v.boolean(),
        timestamp: v.number(),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("messages", args);
    },
});

// Get message count stats
export const stats = query({
    args: {},
    handler: async (ctx) => {
        const messages = await ctx.db.query("messages").collect();
        const channels = await ctx.db.query("channels").collect();

        const totalMessages = messages.length;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMessages = messages.filter(
            (m) => m.timestamp >= todayStart.getTime()
        ).length;

        const connectedChannels = channels.filter(
            (c) => c.status === "connected"
        ).length;

        return {
            totalMessages,
            todayMessages,
            connectedChannels,
            totalChannels: channels.length,
        };
    },
});
