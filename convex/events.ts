/**
 * Event Functions
 * 
 * Audit log for all events across channels
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Log an event
 */
export const log = mutation({
    args: {
        type: v.string(),
        channelId: v.optional(v.id('channels')),
        channelType: v.string(),
        payload: v.any(),
        conversationId: v.optional(v.id('conversations')),
        messageId: v.optional(v.id('messages')),
    },
    handler: async (ctx, args) => {
        return ctx.db.insert('events', {
            type: args.type,
            channelId: args.channelId,
            channelType: args.channelType,
            payload: args.payload,
            conversationId: args.conversationId,
            messageId: args.messageId,
            timestamp: Date.now(),
        });
    },
});

/**
 * Get recent events
 */
export const getRecent = query({
    args: {
        limit: v.optional(v.number()),
        channelId: v.optional(v.id('channels')),
        type: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let query;

        if (args.channelId) {
            query = ctx.db.query('events').withIndex('by_channel', (q) => q.eq('channelId', args.channelId));
        } else if (args.type) {
            query = ctx.db.query('events').withIndex('by_type', (q) => q.eq('type', args.type!));
        } else {
            query = ctx.db.query('events').withIndex('by_time');
        }

        return query.order('desc').take(args.limit ?? 100);
    },
});

/**
 * Get events by type
 */
export const getByType = query({
    args: {
        type: v.string(),
        since: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const query = ctx.db
            .query('events')
            .withIndex('by_type', (q) => q.eq('type', args.type));

        if (args.since) {
            // We can't easily chain .filter() conditionaly without changing type from Query to Query (which is fine)
            // but we need to handle the filtering.
            // Actually, Query.filter returns Query.
            // So if we initialize `let q = ...`, it expects Query.
            return query
                .filter((q) => q.gt(q.field('timestamp'), args.since!))
                .order('desc')
                .take(args.limit ?? 50);
        }

        return query.order('desc').take(args.limit ?? 50);
    },
});

/**
 * Get stats for a time period
 */
export const getStats = query({
    args: {
        since: v.number(),
    },
    handler: async (ctx, args) => {
        const events = await ctx.db
            .query('events')
            .withIndex('by_time')
            .filter((q) => q.gt(q.field('timestamp'), args.since))
            .collect();

        // Count by type
        const byType: Record<string, number> = {};
        const byChannel: Record<string, number> = {};

        for (const event of events) {
            byType[event.type] = (byType[event.type] || 0) + 1;
            byChannel[event.channelType] = (byChannel[event.channelType] || 0) + 1;
        }

        return {
            total: events.length,
            byType,
            byChannel,
        };
    },
});

/**
 * Cleanup old events (call periodically)
 */
export const cleanup = mutation({
    args: {
        olderThan: v.number(), // timestamp
    },
    handler: async (ctx, args) => {
        const oldEvents = await ctx.db
            .query('events')
            .withIndex('by_time')
            .filter((q) => q.lt(q.field('timestamp'), args.olderThan))
            .take(1000); // Process in batches

        for (const event of oldEvents) {
            await ctx.db.delete(event._id);
        }

        return { deleted: oldEvents.length };
    },
});
