import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all channels
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("channels").collect();
    },
});

// Get a single channel
export const get = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.channelId);
    },
});

// Get channels by type
export const getByType = query({
    args: { type: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("channels")
            .withIndex("by_type", (q) => q.eq("type", args.type as any))
            .collect();
    },
});

// Create or update a channel (upsert by name + type)
export const upsert = mutation({
    args: {
        name: v.string(),
        type: v.union(
            v.literal("telegram"),
            v.literal("discord"),
            v.literal("whatsapp"),
            v.literal("imessage")
        ),
        status: v.union(
            v.literal("connected"),
            v.literal("disconnected"),
            v.literal("connecting"),
            v.literal("error")
        ),
        lastConnectedAt: v.optional(v.number()),
        lastError: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Check if channel already exists
        const existing = await ctx.db
            .query("channels")
            .filter((q) =>
                q.and(q.eq(q.field("name"), args.name), q.eq(q.field("type"), args.type))
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                status: args.status,
                lastConnectedAt: args.lastConnectedAt,
                lastError: args.lastError,
                metadata: args.metadata,
            });
            return existing._id;
        }

        return await ctx.db.insert("channels", args);
    },
});

// Update channel status
export const updateStatus = mutation({
    args: {
        channelId: v.id("channels"),
        status: v.union(
            v.literal("connected"),
            v.literal("disconnected"),
            v.literal("connecting"),
            v.literal("error")
        ),
        lastError: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: any = { status: args.status };
        if (args.status === "connected") {
            updates.lastConnectedAt = Date.now();
            updates.lastError = undefined;
        }
        if (args.lastError) {
            updates.lastError = args.lastError;
        }
        await ctx.db.patch(args.channelId, updates);
    },
});

// Delete a channel
export const remove = mutation({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.channelId);
    },
});
