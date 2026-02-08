/**
 * Allsend Channel Hub
 * 
 * The main orchestrator that manages all platform adapters.
 * Provides a unified interface for sending messages and receiving events
 * from all connected channels.
 */

import { EventEmitter } from 'eventemitter3';
import type { BaseAdapter, AdapterEvents } from './adapter';
import type {
    UnifiedMessage,
    UnifiedEvent,
    MessageContent,
    SendMessageOptions,
    SendResult,
    ChannelType,
} from './types';

/**
 * Events emitted by the ChannelHub
 */
export interface HubEvents {
    /** Emitted when a message is received from any channel */
    'message': (message: UnifiedMessage) => void;
    /** Emitted for any event from any channel */
    'event': (event: UnifiedEvent) => void;
    /** Emitted when an adapter connects */
    'adapter:connected': (adapterId: string, channelType: ChannelType) => void;
    /** Emitted when an adapter disconnects */
    'adapter:disconnected': (adapterId: string, channelType: ChannelType, reason?: string) => void;
    /** Emitted when an adapter encounters an error */
    'adapter:error': (adapterId: string, error: Error, context?: string) => void;
    /** Emitted when all adapters are started */
    'started': () => void;
    /** Emitted when all adapters are stopped */
    'stopped': () => void;
}

/**
 * Options for broadcasting a message
 */
export interface BroadcastOptions extends SendMessageOptions {
    /** Only send to these channel types */
    channelTypes?: ChannelType[];
    /** Only send to these adapter IDs */
    adapterIds?: string[];
    /** Exclude these adapter IDs */
    excludeAdapterIds?: string[];
}

/**
 * Result of a broadcast operation
 */
export interface BroadcastResult {
    /** Total adapters the message was sent to */
    totalSent: number;
    /** Individual results per adapter */
    results: Map<string, SendResult>;
    /** Adapters that failed */
    failures: Array<{ adapterId: string; error: Error }>;
}

/**
 * The main Channel Hub that orchestrates all adapters
 * 
 * @example
 * ```typescript
 * const hub = new ChannelHub();
 * 
 * hub.registerAdapter(telegramAdapter);
 * hub.registerAdapter(discordAdapter);
 * 
 * hub.on('message', (msg) => {
 *   console.log(`[${msg.channelType}] ${msg.sender.displayName}: ${msg.content}`);
 * });
 * 
 * await hub.start();
 * ```
 */
export class ChannelHub extends EventEmitter<HubEvents> {
    /** Map of adapter ID to adapter instance */
    private adapters: Map<string, BaseAdapter> = new Map();

    /** Whether the hub is running */
    private running: boolean = false;

    // ===========================================================================
    // Adapter Management
    // ===========================================================================

    /**
     * Register an adapter with the hub
     */
    registerAdapter(adapter: BaseAdapter): void {
        if (this.adapters.has(adapter.id)) {
            throw new Error(`Adapter with ID "${adapter.id}" is already registered`);
        }

        // Set up event forwarding
        this.setupAdapterListeners(adapter);

        this.adapters.set(adapter.id, adapter);

        // If hub is already running, connect the new adapter
        if (this.running) {
            adapter.connect().catch((error) => {
                this.emit('adapter:error', adapter.id, error, 'connect');
            });
        }
    }

    /**
     * Unregister an adapter from the hub
     */
    async unregisterAdapter(adapterId: string): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) {
            return;
        }

        // Disconnect if running
        if (adapter.isConnected) {
            await adapter.disconnect();
        }

        // Remove all listeners
        adapter.removeAllListeners();

        this.adapters.delete(adapterId);
    }

    /**
     * Get an adapter by ID
     */
    getAdapter(adapterId: string): BaseAdapter | undefined {
        return this.adapters.get(adapterId);
    }

    /**
     * Get all adapters of a specific channel type
     */
    getAdaptersByType(channelType: ChannelType): BaseAdapter[] {
        return Array.from(this.adapters.values()).filter(
            (adapter) => adapter.channelType === channelType
        );
    }

    /**
     * Get all registered adapters
     */
    getAllAdapters(): BaseAdapter[] {
        return Array.from(this.adapters.values());
    }

    // ===========================================================================
    // Lifecycle Management
    // ===========================================================================

    /**
     * Start all registered adapters
     */
    async start(): Promise<void> {
        if (this.running) {
            return;
        }

        const connectPromises = Array.from(this.adapters.values()).map(
            async (adapter) => {
                try {
                    await adapter.connect();
                } catch (error) {
                    this.emit('adapter:error', adapter.id, error as Error, 'connect');
                }
            }
        );

        await Promise.all(connectPromises);
        this.running = true;
        this.emit('started');
    }

    /**
     * Stop all registered adapters
     */
    async stop(): Promise<void> {
        if (!this.running) {
            return;
        }

        const disconnectPromises = Array.from(this.adapters.values()).map(
            async (adapter) => {
                try {
                    await adapter.disconnect();
                } catch (error) {
                    this.emit('adapter:error', adapter.id, error as Error, 'disconnect');
                }
            }
        );

        await Promise.all(disconnectPromises);
        this.running = false;
        this.emit('stopped');
    }

    /**
     * Check if the hub is running
     */
    get isRunning(): boolean {
        return this.running;
    }

    // ===========================================================================
    // Messaging
    // ===========================================================================

    /**
     * Send a message to a specific conversation
     * The conversation ID format is: `channelType:adapterId:platformConversationId`
     */
    async send(
        conversationId: string,
        content: MessageContent,
        options?: SendMessageOptions
    ): Promise<SendResult> {
        // Parse conversation ID to find the right adapter
        const [channelType, adapterId, platformConversationId] = conversationId.split(':');

        if (!adapterId || !platformConversationId) {
            return {
                success: false,
                error: new Error(`Invalid conversation ID format: ${conversationId}`),
            };
        }

        const adapter = this.adapters.get(adapterId);
        if (!adapter) {
            return {
                success: false,
                error: new Error(`Adapter not found: ${adapterId}`),
            };
        }

        if (!adapter.isConnected) {
            return {
                success: false,
                error: new Error(`Adapter ${adapterId} is not connected`),
            };
        }

        return adapter.sendMessage(platformConversationId, content, options);
    }

    /**
     * Broadcast a message to multiple adapters
     */
    async broadcast(
        content: MessageContent,
        conversationIds: string[],
        options?: BroadcastOptions
    ): Promise<BroadcastResult> {
        const results = new Map<string, SendResult>();
        const failures: Array<{ adapterId: string; error: Error }> = [];
        let totalSent = 0;

        const sendPromises = conversationIds.map(async (conversationId) => {
            const result = await this.send(conversationId, content, options);
            const [, adapterId] = conversationId.split(':');

            results.set(conversationId, result);

            if (result.success) {
                totalSent++;
            } else if (result.error) {
                failures.push({ adapterId, error: result.error });
            }
        });

        await Promise.all(sendPromises);

        return { totalSent, results, failures };
    }

    /**
     * Reply to a message
     */
    async reply(
        originalMessage: UnifiedMessage,
        content: MessageContent,
        options?: SendMessageOptions
    ): Promise<SendResult> {
        return this.send(originalMessage.conversationId, content, {
            ...options,
            replyTo: originalMessage.platformMessageId,
        });
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================

    /**
     * Set up event listeners for an adapter
     */
    private setupAdapterListeners(adapter: BaseAdapter): void {
        adapter.on('message', (message) => {
            this.emit('message', message);
        });

        adapter.on('event', (event) => {
            this.emit('event', event);
        });

        adapter.on('connected', () => {
            this.emit('adapter:connected', adapter.id, adapter.channelType);
        });

        adapter.on('disconnected', (reason) => {
            this.emit('adapter:disconnected', adapter.id, adapter.channelType, reason);
        });

        adapter.on('error', (error, context) => {
            this.emit('adapter:error', adapter.id, error, context);
        });
    }
}

/**
 * Create a new ChannelHub instance
 */
export function createHub(): ChannelHub {
    return new ChannelHub();
}
