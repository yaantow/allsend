/**
 * Allsend Core
 * 
 * Unified multi-channel messaging library
 */

// Types
export type {
    // Channel types
    ChannelType,
    ChannelConfig,

    // User types
    UnifiedSender,

    // Message content types
    MessageContent,
    TextContent,
    ImageContent,
    VideoContent,
    AudioContent,
    FileContent,
    LocationContent,
    StickerContent,
    ReactionContent,
    ContactContent,
    TextEntity,

    // Message type
    UnifiedMessage,

    // Event types
    EventType,
    UnifiedEvent,
    BaseEvent,
    MessageReceivedEvent,
    MessageSentEvent,
    MessageEditedEvent,
    MessageDeletedEvent,
    ReactionAddedEvent,
    ReactionRemovedEvent,
    TypingStartEvent,
    TypingStopEvent,
    UserJoinedEvent,
    UserLeftEvent,
    ChannelConnectedEvent,
    ChannelDisconnectedEvent,
    ChannelErrorEvent,

    // Utility types
    SendMessageOptions,
    SendResult,
    Conversation,
} from './types';

// Adapter
export { BaseAdapter, isAdapter } from './adapter';
export type { AdapterEvents, AdapterState } from './adapter';

// Hub
export { ChannelHub, createHub } from './hub';
export type { HubEvents, BroadcastOptions, BroadcastResult } from './hub';
