/**
 * Channel Management Functions
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * List all channels
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        return ctx.db.query('channels').order('desc').collect();
    },
});

/**
 * Get a channel by ID
 */
export const get = query({
    args: { id: v.id('channels') },
    handler: async (ctx, args) => {
        return ctx.db.get(args.id);
    },
});

/**
 * Get channels by type
 */
export const getByType = query({
    args: {
        type: v.union(
            v.literal('telegram'),
            v.literal('discord'),
            v.literal('whatsapp'),
            v.literal('imessage')
        ),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query('channels')
            .withIndex('by_type', (q) => q.eq('type', args.type))
            .collect();
    },
});

/**
 * Create a new channel
 */
export const create = mutation({
    args: {
        type: v.union(
            v.literal('telegram'),
            v.literal('discord'),
            v.literal('whatsapp'),
            v.literal('imessage')
        ),
        name: v.string(),
        credentials: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        return ctx.db.insert('channels', {
            type: args.type,
            name: args.name,
            enabled: true,
            credentials: args.credentials,
            metadata: args.metadata,
            status: 'disconnected',
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Update a channel
 */
export const update = mutation({
    args: {
        id: v.id('channels'),
        name: v.optional(v.string()),
        enabled: v.optional(v.boolean()),
        credentials: v.optional(v.string()),
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
 * Update channel status
 */
export const updateStatus = mutation({
    args: {
        id: v.id('channels'),
        status: v.union(
            v.literal('connected'),
            v.literal('disconnected'),
            v.literal('error')
        ),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        await ctx.db.patch(args.id, {
            status: args.status,
            lastConnectedAt: args.status === 'connected' ? now : undefined,
            lastError: args.error,
            updatedAt: now,
        });
    },
});

/**
 * Delete a channel
 */
export const remove = mutation({
    args: { id: v.id('channels') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
