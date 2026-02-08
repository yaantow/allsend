/**
 * Conversation Functions
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * List all conversations
 */
export const list = query({
    args: {
        channelId: v.optional(v.id('channels')),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        if (args.channelId) {
            return ctx.db.query('conversations')
                .withIndex('by_channel', (q) => q.eq('channelId', args.channelId!))
                .order('desc')
                .take(args.limit ?? 50);
        }

        return ctx.db.query('conversations')
            .order('desc')
            .take(args.limit ?? 50);
    },
});

/**
 * Get a conversation by ID
 */
export const get = query({
    args: { id: v.id('conversations') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

/**
 * Get or create a conversation by platform ID
 */
export const getOrCreate = mutation({
    args: {
        channelId: v.id('channels'),
        channelType: v.string(),
        platformConversationId: v.string(),
        title: v.optional(v.string()),
        isGroup: v.boolean(),
        participantCount: v.optional(v.number()),
        avatarUrl: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Check if conversation exists
        const existing = await ctx.db
            .query('conversations')
            .withIndex('by_platform_id', (q) =>
                q.eq('channelType', args.channelType).eq('platformConversationId', args.platformConversationId)
            )
            .first();

        if (existing) {
            return existing._id;
        }

        // Create new conversation
        const now = Date.now();
        return ctx.db.insert('conversations', {
            channelId: args.channelId,
            channelType: args.channelType,
            platformConversationId: args.platformConversationId,
            title: args.title,
            isGroup: args.isGroup,
            participantCount: args.participantCount,
            avatarUrl: args.avatarUrl,
            unreadCount: 0,
            metadata: args.metadata,
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Update conversation
 */
export const update = mutation({
    args: {
        id: v.id('conversations'),
        title: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        participantCount: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;

        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Mark conversation as read
 */
export const markRead = mutation({
    args: { id: v.id('conversations') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            unreadCount: 0,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Increment unread count
 */
export const incrementUnread = mutation({
    args: { id: v.id('conversations') },
    handler: async (ctx, args) => {
        const conversation = await ctx.db.get(args.id);
        if (!conversation) return;

        await ctx.db.patch(args.id, {
            unreadCount: (conversation.unreadCount || 0) + 1,
            updatedAt: Date.now(),
        });
    },
});

/**
 * Get recent conversations sorted by last message
 */
export const getRecent = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query('conversations')
            .withIndex('by_last_message')
            .order('desc')
            .take(args.limit ?? 20);
    },
});
