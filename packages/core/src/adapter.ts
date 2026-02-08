/**
 * BridgeKit Base Adapter
 * 
 * Abstract base class that all platform adapters must extend.
 * Provides the contract for message sending/receiving and lifecycle management.
 */

import { EventEmitter } from 'eventemitter3';
import type {
    ChannelType,
    ChannelConfig,
    UnifiedMessage,
    UnifiedEvent,
    MessageContent,
    SendMessageOptions,
    SendResult,
    Conversation,
} from './types';

/**
 * Event types emitted by adapters
 */
export interface AdapterEvents {
    'message': (message: UnifiedMessage) => void;
    'event': (event: UnifiedEvent) => void;
    'connected': () => void;
    'disconnected': (reason?: string) => void;
    'error': (error: Error, context?: string) => void;
}

/**
 * Adapter connection state
 */
export type AdapterState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Abstract base class for platform adapters
 * 
 * @example
 * ```typescript
 * class TelegramAdapter extends BaseAdapter {
 *   readonly channelType = 'telegram';
 *   // ... implement abstract methods
 * }
 * ```
 */
export abstract class BaseAdapter extends EventEmitter<AdapterEvents> {
    /** The type of channel this adapter handles */
    abstract readonly channelType: ChannelType;

    /** Configuration for this adapter instance */
    protected config: ChannelConfig;

    /** Current connection state */
    protected state: AdapterState = 'disconnected';

    constructor(config: ChannelConfig) {
        super();
        this.config = config;
    }

    // ===========================================================================
    // Getters
    // ===========================================================================

    /** Get the adapter's unique ID */
    get id(): string {
        return this.config.id;
    }

    /** Get the adapter's display name */
    get name(): string {
        return this.config.name;
    }

    /** Check if adapter is connected */
    get isConnected(): boolean {
        return this.state === 'connected';
    }

    /** Get current connection state */
    get connectionState(): AdapterState {
        return this.state;
    }

    // ===========================================================================
    // Lifecycle Methods (must be implemented by subclasses)
    // ===========================================================================

    /**
     * Connect to the messaging platform
     * Should set up webhooks, polling, or websocket connections
     */
    abstract connect(): Promise<void>;

    /**
     * Disconnect from the messaging platform
     * Should clean up all connections and resources
     */
    abstract disconnect(): Promise<void>;

    // ===========================================================================
    // Messaging Methods (must be implemented by subclasses)
    // ===========================================================================

    /**
     * Send a message to a conversation
     */
    abstract sendMessage(
        conversationId: string,
        content: MessageContent,
        options?: SendMessageOptions
    ): Promise<SendResult>;

    /**
     * Edit an existing message
     */
    abstract editMessage(
        messageId: string,
        content: MessageContent
    ): Promise<SendResult>;

    /**
     * Delete a message
     */
    abstract deleteMessage(messageId: string): Promise<void>;

    // ===========================================================================
    // Reaction Methods (optional - may not be supported by all platforms)
    // ===========================================================================

    /**
     * Add a reaction to a message
     * Default implementation throws 'not supported' - override if platform supports
     */
    async addReaction(messageId: string, emoji: string): Promise<void> {
        throw new Error(`Reactions not supported by ${this.channelType}`);
    }

    /**
     * Remove a reaction from a message
     * Default implementation throws 'not supported' - override if platform supports
     */
    async removeReaction(messageId: string, emoji: string): Promise<void> {
        throw new Error(`Reactions not supported by ${this.channelType}`);
    }

    // ===========================================================================
    // Typing Indicator (optional)
    // ===========================================================================

    /**
     * Send typing indicator to a conversation
     * Default implementation is a no-op - override if platform supports
     */
    async sendTypingIndicator(conversationId: string): Promise<void> {
        // No-op by default
    }

    // ===========================================================================
    // Conversation Methods (optional)
    // ===========================================================================

    /**
     * Get conversation metadata
     * Default implementation returns basic info - override for full support
     */
    async getConversation(conversationId: string): Promise<Conversation | null> {
        return null;
    }

    /**
     * List recent conversations
     * Default implementation returns empty array - override for full support
     */
    async listConversations(limit?: number): Promise<Conversation[]> {
        return [];
    }

    // ===========================================================================
    // Protected Helper Methods
    // ===========================================================================

    /**
     * Update connection state and emit appropriate events
     */
    protected setState(newState: AdapterState, reason?: string): void {
        const oldState = this.state;
        this.state = newState;

        if (newState === 'connected' && oldState !== 'connected') {
            this.emit('connected');
        } else if (newState === 'disconnected' && oldState === 'connected') {
            this.emit('disconnected', reason);
        }
    }

    /**
     * Emit an error event
     */
    protected emitError(error: Error, context?: string): void {
        this.emit('error', error, context);
    }

    /**
     * Generate a unique message ID
     */
    protected generateMessageId(): string {
        return `${this.channelType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Generate a unique conversation ID from platform ID
     */
    protected generateConversationId(platformConversationId: string): string {
        return `${this.channelType}:${this.id}:${platformConversationId}`;
    }
}

/**
 * Type guard to check if an object is a BaseAdapter
 */
export function isAdapter(obj: unknown): obj is BaseAdapter {
    return (
        obj instanceof BaseAdapter ||
        (typeof obj === 'object' &&
            obj !== null &&
            'channelType' in obj &&
            'connect' in obj &&
            'sendMessage' in obj)
    );
}
