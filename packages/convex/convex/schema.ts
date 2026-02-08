/**
 * BridgeKit Convex Schema
 * 
 * Database schema for storing channels, messages, and events.
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    /**
     * Channel configurations
     * Stores credentials and settings for each connected channel
     */
    channels: defineTable({
        type: v.union(
            v.literal('telegram'),
            v.literal('discord'),
            v.literal('whatsapp'),
            v.literal('imessage')
        ),
        name: v.string(),
        enabled: v.boolean(),

        // Encrypted credentials stored as JSON
        credentials: v.optional(v.string()),

        // Channel metadata
        metadata: v.optional(v.any()),

        // Connection status
        status: v.union(
            v.literal('connected'),
            v.literal('disconnected'),
            v.literal('error')
        ),
        lastConnectedAt: v.optional(v.number()),
        lastError: v.optional(v.string()),

        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_type', ['type'])
        .index('by_status', ['status']),

    /**
     * Conversations
     * Normalized view of chats/channels across all platforms
     */
    conversations: defineTable({
        channelId: v.id('channels'),
        channelType: v.string(),
        platformConversationId: v.string(),

        // Display info
        title: v.optional(v.string()),
        isGroup: v.boolean(),
        participantCount: v.optional(v.number()),
        avatarUrl: v.optional(v.string()),

        // Activity
        lastMessageAt: v.optional(v.number()),
        lastMessagePreview: v.optional(v.string()),
        unreadCount: v.number(),

        // Metadata
        metadata: v.optional(v.any()),

        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index('by_channel', ['channelId'])
        .index('by_platform_id', ['channelType', 'platformConversationId'])
        .index('by_last_message', ['lastMessageAt']),

    /**
     * Messages
     * Unified message storage across all platforms
     */
    messages: defineTable({
        conversationId: v.id('conversations'),
        channelType: v.string(),
        platformMessageId: v.string(),

        // Sender info
        senderId: v.string(),
        senderName: v.string(),
        senderAvatarUrl: v.optional(v.string()),
        isBot: v.optional(v.boolean()),

        // Content
        contentType: v.union(
            v.literal('text'),
            v.literal('image'),
            v.literal('video'),
            v.literal('audio'),
            v.literal('file'),
            v.literal('location'),
            v.literal('sticker'),
            v.literal('reaction'),
            v.literal('contact')
        ),
        content: v.any(), // MessageContent object

        // Message state
        isOutgoing: v.boolean(),
        isEdited: v.optional(v.boolean()),
        isDeleted: v.optional(v.boolean()),

        // Threading
        replyToId: v.optional(v.string()),
        threadId: v.optional(v.string()),

        // Timestamps
        timestamp: v.number(),
        editedAt: v.optional(v.number()),

        // Raw platform data for debugging
        raw: v.optional(v.any()),
    })
        .index('by_conversation', ['conversationId', 'timestamp'])
        .index('by_platform_id', ['channelType', 'platformMessageId'])
        .searchIndex('search_content', {
            searchField: 'content',
            filterFields: ['conversationId', 'channelType'],
        }),

    /**
     * Events
     * Audit log of all events for debugging and analytics
     */
    events: defineTable({
        type: v.string(),
        channelId: v.optional(v.id('channels')),
        channelType: v.string(),

        // Event payload
        payload: v.any(),

        // Context
        conversationId: v.optional(v.id('conversations')),
        messageId: v.optional(v.id('messages')),

        timestamp: v.number(),
    })
        .index('by_type', ['type', 'timestamp'])
        .index('by_channel', ['channelId', 'timestamp'])
        .index('by_time', ['timestamp']),

    /**
     * Users
     * Normalized user/contact storage across platforms
     */
    users: defineTable({
        channelType: v.string(),
        platformUserId: v.string(),

        displayName: v.string(),
        username: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        isBot: v.optional(v.boolean()),

        // Cross-platform identity linking (optional)
        linkedUserId: v.optional(v.string()),

        metadata: v.optional(v.any()),

        firstSeenAt: v.number(),
        lastSeenAt: v.number(),
    })
        .index('by_platform', ['channelType', 'platformUserId'])
        .index('by_linked', ['linkedUserId']),
});
