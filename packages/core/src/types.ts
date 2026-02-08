/**
 * BridgeKit Core Types
 * 
 * Unified message protocol that normalizes messages across all platforms.
 * These types are the foundation of BridgeKit's cross-platform abstraction.
 */

// =============================================================================
// Channel Types
// =============================================================================

/**
 * Supported messaging platforms
 */
export type ChannelType = 'telegram' | 'discord' | 'whatsapp' | 'imessage';

/**
 * Configuration for a channel instance
 */
export interface ChannelConfig {
    /** Unique identifier for this channel instance */
    id: string;
    /** Type of messaging platform */
    type: ChannelType;
    /** Human-readable name for this channel */
    name: string;
    /** Whether the channel is enabled */
    enabled: boolean;
    /** Platform-specific configuration (tokens, credentials, etc.) */
    credentials: Record<string, unknown>;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}

// =============================================================================
// User & Sender Types
// =============================================================================

/**
 * Unified user/sender representation across platforms
 */
export interface UnifiedSender {
    /** BridgeKit internal user ID */
    id: string;
    /** Original platform-specific user ID */
    platformId: string;
    /** Display name to show in UI */
    displayName: string;
    /** Username/handle if available */
    username?: string;
    /** Avatar/profile picture URL */
    avatarUrl?: string;
    /** Whether this is a bot/automated account */
    isBot?: boolean;
    /** Platform-specific raw user data */
    raw?: unknown;
}

// =============================================================================
// Message Content Types
// =============================================================================

/**
 * Text message content
 */
export interface TextContent {
    type: 'text';
    text: string;
    /** Parsed entities (mentions, links, formatting) */
    entities?: TextEntity[];
}

export interface TextEntity {
    type: 'mention' | 'url' | 'bold' | 'italic' | 'code' | 'pre' | 'hashtag';
    offset: number;
    length: number;
    /** Additional data (e.g., URL for links, user ID for mentions) */
    data?: string;
}

/**
 * Image message content
 */
export interface ImageContent {
    type: 'image';
    /** URL to the image (may be temporary/signed) */
    url: string;
    /** Optional caption */
    caption?: string;
    /** Image dimensions */
    width?: number;
    height?: number;
    /** File size in bytes */
    size?: number;
    /** MIME type */
    mimeType?: string;
}

/**
 * Video message content
 */
export interface VideoContent {
    type: 'video';
    url: string;
    caption?: string;
    width?: number;
    height?: number;
    /** Duration in seconds */
    duration?: number;
    size?: number;
    mimeType?: string;
    /** Thumbnail URL */
    thumbnailUrl?: string;
}

/**
 * Audio/voice message content
 */
export interface AudioContent {
    type: 'audio';
    url: string;
    duration?: number;
    size?: number;
    mimeType?: string;
    /** Whether this is a voice note vs regular audio */
    isVoiceNote?: boolean;
    /** Transcription if available */
    transcription?: string;
}

/**
 * File/document message content
 */
export interface FileContent {
    type: 'file';
    url: string;
    filename: string;
    mimeType: string;
    size?: number;
    caption?: string;
}

/**
 * Location message content
 */
export interface LocationContent {
    type: 'location';
    latitude: number;
    longitude: number;
    /** Name of the place */
    title?: string;
    /** Address or description */
    address?: string;
}

/**
 * Sticker message content
 */
export interface StickerContent {
    type: 'sticker';
    url: string;
    /** Associated emoji */
    emoji?: string;
    /** Sticker set name */
    setName?: string;
    /** Whether animated */
    isAnimated?: boolean;
}

/**
 * Reaction to a message (not a standalone message)
 */
export interface ReactionContent {
    type: 'reaction';
    emoji: string;
    /** ID of the message being reacted to */
    targetMessageId: string;
}

/**
 * Contact/vCard message content
 */
export interface ContactContent {
    type: 'contact';
    name: string;
    phone?: string;
    email?: string;
    /** Raw vCard data */
    vCard?: string;
}

/**
 * Union of all message content types
 */
export type MessageContent =
    | TextContent
    | ImageContent
    | VideoContent
    | AudioContent
    | FileContent
    | LocationContent
    | StickerContent
    | ReactionContent
    | ContactContent;

// =============================================================================
// Unified Message
// =============================================================================

/**
 * The core unified message type that represents any message from any platform
 */
export interface UnifiedMessage {
    /** BridgeKit internal message ID */
    id: string;
    /** Platform this message originated from */
    channelType: ChannelType;
    /** BridgeKit channel configuration ID */
    channelId: string;
    /** Platform-specific message ID */
    platformMessageId: string;
    /** Normalized conversation identifier */
    conversationId: string;
    /** Platform-specific conversation/chat ID */
    platformConversationId: string;

    /** Sender information */
    sender: UnifiedSender;

    /** Message content */
    content: MessageContent;

    /** When the message was sent */
    timestamp: Date;
    /** When the message was last edited (if applicable) */
    editedAt?: Date;

    /** ID of message being replied to */
    replyToId?: string;
    /** Thread/topic ID for threaded conversations */
    threadId?: string;

    /** Whether this message was sent by our bot */
    isOutgoing: boolean;

    /** Platform-specific raw message data */
    raw?: unknown;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * All possible event types
 */
export type EventType =
    | 'message.received'
    | 'message.sent'
    | 'message.edited'
    | 'message.deleted'
    | 'reaction.added'
    | 'reaction.removed'
    | 'typing.start'
    | 'typing.stop'
    | 'user.joined'
    | 'user.left'
    | 'channel.connected'
    | 'channel.disconnected'
    | 'channel.error';

/**
 * Base event structure
 */
export interface BaseEvent<T extends EventType, P = unknown> {
    type: T;
    channelType: ChannelType;
    channelId: string;
    timestamp: Date;
    payload: P;
}

// Specific event types
export type MessageReceivedEvent = BaseEvent<'message.received', UnifiedMessage>;
export type MessageSentEvent = BaseEvent<'message.sent', UnifiedMessage>;
export type MessageEditedEvent = BaseEvent<'message.edited', { message: UnifiedMessage; previousContent: MessageContent }>;
export type MessageDeletedEvent = BaseEvent<'message.deleted', { messageId: string; conversationId: string }>;
export type ReactionAddedEvent = BaseEvent<'reaction.added', { messageId: string; emoji: string; userId: string }>;
export type ReactionRemovedEvent = BaseEvent<'reaction.removed', { messageId: string; emoji: string; userId: string }>;
export type TypingStartEvent = BaseEvent<'typing.start', { conversationId: string; userId: string }>;
export type TypingStopEvent = BaseEvent<'typing.stop', { conversationId: string; userId: string }>;
export type UserJoinedEvent = BaseEvent<'user.joined', { conversationId: string; user: UnifiedSender }>;
export type UserLeftEvent = BaseEvent<'user.left', { conversationId: string; user: UnifiedSender }>;
export type ChannelConnectedEvent = BaseEvent<'channel.connected', { name: string }>;
export type ChannelDisconnectedEvent = BaseEvent<'channel.disconnected', { name: string; reason?: string }>;
export type ChannelErrorEvent = BaseEvent<'channel.error', { error: Error; context?: string }>;

/**
 * Union of all event types
 */
export type UnifiedEvent =
    | MessageReceivedEvent
    | MessageSentEvent
    | MessageEditedEvent
    | MessageDeletedEvent
    | ReactionAddedEvent
    | ReactionRemovedEvent
    | TypingStartEvent
    | TypingStopEvent
    | UserJoinedEvent
    | UserLeftEvent
    | ChannelConnectedEvent
    | ChannelDisconnectedEvent
    | ChannelErrorEvent;

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
    /** Reply to a specific message */
    replyTo?: string;
    /** Thread ID for threaded conversations */
    threadId?: string;
    /** Parse mode (for text formatting) */
    parseMode?: 'text' | 'markdown' | 'html';
    /** Whether to notify the recipient */
    silent?: boolean;
}

/**
 * Result of sending a message
 */
export interface SendResult {
    success: boolean;
    message?: UnifiedMessage;
    error?: Error;
}

/**
 * Conversation metadata
 */
export interface Conversation {
    id: string;
    channelType: ChannelType;
    channelId: string;
    platformConversationId: string;
    /** Title for groups, or user name for DMs */
    title?: string;
    /** Whether this is a group conversation */
    isGroup: boolean;
    /** Number of participants (for groups) */
    participantCount?: number;
    /** Last message timestamp */
    lastMessageAt?: Date;
    /** Conversation-specific metadata */
    metadata?: Record<string, unknown>;
}
