import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Connected messaging channels (adapters)
    channels: defineTable({
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
    }).index("by_type", ["type"]),

    // Messages from all channels
    messages: defineTable({
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
    })
        .index("by_channel", ["channelId"])
        .index("by_timestamp", ["timestamp"])
        .index("by_conversation", ["conversationId"]),

    // Events log
    events: defineTable({
        type: v.string(),
        channelType: v.string(),
        channelId: v.optional(v.id("channels")),
        timestamp: v.number(),
        payload: v.optional(v.any()),
    }).index("by_timestamp", ["timestamp"]),
});
