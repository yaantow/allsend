import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get recent events
export const list = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 100;
        return await ctx.db
            .query("events")
            .withIndex("by_timestamp")
            .order("desc")
            .take(limit);
    },
});

// Log an event
export const log = mutation({
    args: {
        type: v.string(),
        channelType: v.string(),
        channelId: v.optional(v.id("channels")),
        payload: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("events", {
            type: args.type,
            channelType: args.channelType,
            channelId: args.channelId,
            timestamp: Date.now(),
            payload: args.payload,
        });
    },
});
