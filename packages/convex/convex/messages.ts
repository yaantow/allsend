/**
 * Message Functions
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Get messages for a conversation
 */
export const getByConversation = query({
    args: {
        conversationId: v.id('conversations'),
        limit: v.optional(v.number()),
        cursor: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;

        let query = ctx.db
            .query('messages')
            .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
            .order('desc');

        if (args.cursor) {
            query = query.filter((q) => q.lt(q.field('timestamp'), args.cursor));
        }

        return query.take(limit);
    },
});

/**
 * Get a message by platform ID
 */
export const getByPlatformId = query({
    args: {
        channelType: v.string(),
        platformMessageId: v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query('messages')
            .withIndex('by_platform_id', (q) =>
                q.eq('channelType', args.channelType).eq('platformMessageId', args.platformMessageId)
            )
            .first();
    },
});

/**
 * Store an incoming message
 */
export const receive = mutation({
    args: {
        conversationId: v.id('conversations'),
        channelType: v.string(),
        platformMessageId: v.string(),
        senderId: v.string(),
        senderName: v.string(),
        senderAvatarUrl: v.optional(v.string()),
        isBot: v.optional(v.boolean()),
        contentType: v.string(),
        content: v.any(),
        replyToId: v.optional(v.string()),
        threadId: v.optional(v.string()),
        timestamp: v.number(),
        raw: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // Store the message
        const messageId = await ctx.db.insert('messages', {
            conversationId: args.conversationId,
            channelType: args.channelType,
            platformMessageId: args.platformMessageId,
            senderId: args.senderId,
            senderName: args.senderName,
            senderAvatarUrl: args.senderAvatarUrl,
            isBot: args.isBot,
            contentType: args.contentType as any,
            content: args.content,
            isOutgoing: false,
            replyToId: args.replyToId,
            threadId: args.threadId,
            timestamp: args.timestamp,
            raw: args.raw,
        });

        // Update conversation last message
        await ctx.db.patch(args.conversationId, {
            lastMessageAt: args.timestamp,
            lastMessagePreview: args.contentType === 'text'
                ? args.content.text?.slice(0, 100)
                : `[${args.contentType}]`,
            updatedAt: Date.now(),
        });

        return messageId;
    },
});

/**
 * Store an outgoing message
 */
export const send = mutation({
    args: {
        conversationId: v.id('conversations'),
        channelType: v.string(),
        platformMessageId: v.string(),
        contentType: v.string(),
        content: v.any(),
        replyToId: v.optional(v.string()),
        threadId: v.optional(v.string()),
        timestamp: v.number(),
    },
    handler: async (ctx, args) => {
        // Store the message
        const messageId = await ctx.db.insert('messages', {
            conversationId: args.conversationId,
            channelType: args.channelType,
            platformMessageId: args.platformMessageId,
            senderId: 'system',
            senderName: 'Allsend',
            contentType: args.contentType as any,
            content: args.content,
            isOutgoing: true,
            replyToId: args.replyToId,
            threadId: args.threadId,
            timestamp: args.timestamp,
        });

        // Update conversation last message
        await ctx.db.patch(args.conversationId, {
            lastMessageAt: args.timestamp,
            lastMessagePreview: args.contentType === 'text'
                ? args.content.text?.slice(0, 100)
                : `[${args.contentType}]`,
            updatedAt: Date.now(),
        });

        return messageId;
    },
});

/**
 * Mark a message as edited
 */
export const markEdited = mutation({
    args: {
        id: v.id('messages'),
        content: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            content: args.content,
            isEdited: true,
            editedAt: Date.now(),
        });
    },
});

/**
 * Mark a message as deleted
 */
export const markDeleted = mutation({
    args: { id: v.id('messages') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            isDeleted: true,
        });
    },
});

/**
 * Search messages
 */
export const search = query({
    args: {
        query: v.string(),
        conversationId: v.optional(v.id('conversations')),
        channelType: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let searchQuery = ctx.db
            .query('messages')
            .withSearchIndex('search_content', (q) => {
                let sq = q.search('content', args.query);
                if (args.conversationId) {
                    sq = sq.eq('conversationId', args.conversationId);
                }
                if (args.channelType) {
                    sq = sq.eq('channelType', args.channelType);
                }
                return sq;
            });

        return searchQuery.take(args.limit ?? 20);
    },
});
