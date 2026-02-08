/**
 * Allsend iMessage Adapter
 * 
 * Integrates with iMessage via BlueBubbles server.
 * Requires a macOS machine running BlueBubbles server.
 * 
 * @see https://bluebubbles.app/
 * @see https://docs.bluebubbles.app/
 */

import {
    BaseAdapter,
    type ChannelConfig,
    type UnifiedMessage,
    type UnifiedSender,
    type MessageContent,
    type SendMessageOptions,
    type SendResult,
    type Conversation,
} from '@allsend/core';

/**
 * iMessage/BlueBubbles-specific configuration
 */
export interface iMessageConfig extends ChannelConfig {
    type: 'imessage';
    credentials: {
        /** BlueBubbles server URL (e.g., http://localhost:1234) */
        serverUrl: string;
        /** BlueBubbles server password */
        password: string;
    };
}

/**
 * BlueBubbles API response types
 */
interface BBMessage {
    guid: string;
    text: string;
    dateCreated: number;
    dateRead?: number;
    dateDelivered?: number;
    isFromMe: boolean;
    handleId: number;
    handle?: BBHandle;
    chats?: BBChat[];
    attachments?: BBAttachment[];
    associatedMessageGuid?: string;
    associatedMessageType?: number;
}

interface BBHandle {
    id: number;
    address: string;
    country?: string;
    service: string;
}

interface BBChat {
    guid: string;
    displayName?: string;
    participants?: BBHandle[];
    isGroup: boolean;
    lastMessage?: BBMessage;
}

interface BBAttachment {
    guid: string;
    mimeType: string;
    filename: string;
    transferName: string;
    totalBytes: number;
}

/**
 * iMessage adapter for Allsend via BlueBubbles
 * 
 * @example
 * ```typescript
 * const imessage = new iMessageAdapter({
 *   id: 'my-imessage',
 *   type: 'imessage',
 *   name: 'My iMessage',
 *   enabled: true,
 *   credentials: {
 *     serverUrl: 'http://localhost:1234',
 *     password: process.env.BLUEBUBBLES_PASSWORD!,
 *   },
 * });
 * 
 * hub.registerAdapter(imessage);
 * ```
 */
export class iMessageAdapter extends BaseAdapter {
    readonly channelType = 'imessage' as const;

    protected override config: iMessageConfig;
    private ws: WebSocket | null = null;
    private pollInterval: ReturnType<typeof setInterval> | null = null;
    private lastMessageDate: number = Date.now();

    constructor(config: iMessageConfig) {
        super(config);
        this.config = config;
    }

    // ===========================================================================
    // Lifecycle
    // ===========================================================================

    async connect(): Promise<void> {
        this.setState('connecting');

        try {
            // Verify server connection
            const serverInfo = await this.apiRequest('/api/v1/server/info');
            console.log(`[iMessage] Connected to BlueBubbles v${serverInfo.data?.server_version || 'unknown'}`);

            // Try WebSocket for real-time updates
            await this.connectWebSocket();

            // Fall back to polling if WebSocket fails
            if (!this.ws) {
                this.startPolling();
            }

            this.setState('connected');
        } catch (error) {
            this.setState('error');
            this.emitError(error as Error, 'connect');
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }

            this.setState('disconnected');
        } catch (error) {
            this.emitError(error as Error, 'disconnect');
            throw error;
        }
    }

    // ===========================================================================
    // Messaging
    // ===========================================================================

    async sendMessage(
        conversationId: string,
        content: MessageContent,
        options?: SendMessageOptions
    ): Promise<SendResult> {
        try {
            let response;

            switch (content.type) {
                case 'text':
                    response = await this.apiRequest('/api/v1/message/text', {
                        method: 'POST',
                        body: {
                            chatGuid: conversationId,
                            message: content.text,
                            method: 'private-api', // Use private API for better compatibility
                        },
                    });
                    break;

                case 'image':
                case 'video':
                case 'audio':
                case 'file':
                    // Upload attachment first, then send
                    const attachmentData = await this.uploadAttachment(content.url);
                    response = await this.apiRequest('/api/v1/message/attachment', {
                        method: 'POST',
                        body: {
                            chatGuid: conversationId,
                            attachmentGuid: attachmentData.guid,
                            attachmentName: 'filename' in content ? content.filename : 'attachment',
                        },
                    });
                    break;

                case 'reaction':
                    // iMessage tapback reactions
                    response = await this.apiRequest('/api/v1/message/react', {
                        method: 'POST',
                        body: {
                            chatGuid: conversationId,
                            selectedMessageGuid: content.targetMessageId,
                            reaction: this.emojiToTapback(content.emoji),
                        },
                    });
                    break;

                default:
                    return {
                        success: false,
                        error: new Error(`Unsupported content type: ${(content as MessageContent).type}`),
                    };
            }

            if (response.status !== 200) {
                return {
                    success: false,
                    error: new Error(response.message || 'Failed to send message'),
                };
            }

            return {
                success: true,
                message: response.data ? this.transformMessage(response.data, true) : undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
            };
        }
    }

    async editMessage(
        messageId: string,
        content: MessageContent
    ): Promise<SendResult> {
        // iMessage edit requires iOS 16+ and macOS 13+
        try {
            if (content.type !== 'text') {
                return {
                    success: false,
                    error: new Error('Only text messages can be edited'),
                };
            }

            const response = await this.apiRequest('/api/v1/message/edit', {
                method: 'POST',
                body: {
                    messageGuid: messageId,
                    editedMessage: content.text,
                    backwardsCompatMessage: content.text,
                },
            });

            return {
                success: response.status === 200,
                error: response.status !== 200 ? new Error(response.message) : undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
            };
        }
    }

    async deleteMessage(messageId: string): Promise<void> {
        // iMessage unsend requires iOS 16+ and macOS 13+
        await this.apiRequest('/api/v1/message/unsend', {
            method: 'POST',
            body: {
                messageGuid: messageId,
            },
        });
    }

    // ===========================================================================
    // Reactions (Tapbacks)
    // ===========================================================================

    async addReaction(messageId: string, emoji: string): Promise<void> {
        const [chatGuid, msgGuid] = messageId.split('::');

        await this.apiRequest('/api/v1/message/react', {
            method: 'POST',
            body: {
                chatGuid,
                selectedMessageGuid: msgGuid,
                reaction: this.emojiToTapback(emoji),
            },
        });
    }

    async removeReaction(messageId: string, emoji: string): Promise<void> {
        const [chatGuid, msgGuid] = messageId.split('::');

        // To remove, send the same tapback again (toggles off)
        await this.apiRequest('/api/v1/message/react', {
            method: 'POST',
            body: {
                chatGuid,
                selectedMessageGuid: msgGuid,
                reaction: this.emojiToTapback(emoji),
            },
        });
    }

    // ===========================================================================
    // Typing Indicator
    // ===========================================================================

    async sendTypingIndicator(conversationId: string): Promise<void> {
        await this.apiRequest('/api/v1/chat/typing', {
            method: 'POST',
            body: {
                chatGuid: conversationId,
            },
        });
    }

    // ===========================================================================
    // Conversation Methods
    // ===========================================================================

    async getConversation(conversationId: string): Promise<Conversation | null> {
        try {
            const response = await this.apiRequest(`/api/v1/chat/${encodeURIComponent(conversationId)}`);

            if (!response.data) return null;

            const chat: BBChat = response.data;

            return {
                id: this.generateConversationId(chat.guid),
                channelType: 'imessage',
                channelId: this.id,
                platformConversationId: chat.guid,
                title: chat.displayName || chat.participants?.[0]?.address || 'Unknown',
                isGroup: chat.isGroup,
                participantCount: chat.participants?.length,
                lastMessageAt: chat.lastMessage ? new Date(chat.lastMessage.dateCreated) : undefined,
            };
        } catch {
            return null;
        }
    }

    async listConversations(limit = 50): Promise<Conversation[]> {
        const response = await this.apiRequest('/api/v1/chat/query', {
            method: 'POST',
            body: {
                limit,
                offset: 0,
                withLastMessage: true,
                sort: 'lastmessage',
            },
        });

        if (!response.data) return [];

        return response.data.map((chat: BBChat) => ({
            id: this.generateConversationId(chat.guid),
            channelType: 'imessage' as const,
            channelId: this.id,
            platformConversationId: chat.guid,
            title: chat.displayName || chat.participants?.[0]?.address || 'Unknown',
            isGroup: chat.isGroup,
            participantCount: chat.participants?.length,
            lastMessageAt: chat.lastMessage ? new Date(chat.lastMessage.dateCreated) : undefined,
        }));
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================

    private async apiRequest(
        endpoint: string,
        options: { method?: string; body?: any } = {}
    ): Promise<{ status: number; message?: string; data?: any }> {
        const url = `${this.config.credentials.serverUrl}${endpoint}`;

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.config.credentials.password,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        return response.json() as Promise<{ status: number; message?: string; data?: any }>;
    }

    private async connectWebSocket(): Promise<void> {
        return new Promise((resolve) => {
            try {
                const wsUrl = this.config.credentials.serverUrl
                    .replace('http://', 'ws://')
                    .replace('https://', 'wss://');

                this.ws = new WebSocket(`${wsUrl}/socket.io/?EIO=4&transport=websocket`);

                this.ws.onopen = () => {
                    console.log('[iMessage] WebSocket connected');
                    // Authenticate
                    if (this.ws) {
                        this.ws.send(`40{"password":"${this.config.credentials.password}"}`);
                    }
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleWebSocketMessage(event.data as string);
                };

                this.ws.onerror = (error) => {
                    console.warn('[iMessage] WebSocket error, falling back to polling');
                    this.ws = null;
                    resolve();
                };

                this.ws.onclose = () => {
                    this.ws = null;
                };

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (this.ws?.readyState !== WebSocket.OPEN) {
                        this.ws?.close();
                        this.ws = null;
                        resolve();
                    }
                }, 5000);
            } catch {
                resolve();
            }
        });
    }

    private handleWebSocketMessage(data: string): void {
        // Socket.IO protocol parsing
        if (data.startsWith('42')) {
            try {
                const [event, payload] = JSON.parse(data.slice(2));

                if (event === 'new-message') {
                    const message = this.transformMessage(payload, false);
                    this.emit('message', message);
                    this.emit('event', {
                        type: 'message.received',
                        channelType: 'imessage',
                        channelId: this.id,
                        timestamp: new Date(),
                        payload: message,
                    });
                }
            } catch {
                // Ignore parsing errors
            }
        }
    }

    private startPolling(): void {
        console.log('[iMessage] Using polling for updates');

        this.pollInterval = setInterval(async () => {
            try {
                const response = await this.apiRequest('/api/v1/message/query', {
                    method: 'POST',
                    body: {
                        limit: 50,
                        offset: 0,
                        after: this.lastMessageDate,
                        sort: 'ASC',
                    },
                });

                if (response.data?.length) {
                    for (const msg of response.data) {
                        if (msg.dateCreated > this.lastMessageDate) {
                            this.lastMessageDate = msg.dateCreated;

                            if (!msg.isFromMe) {
                                const message = this.transformMessage(msg, false);
                                this.emit('message', message);
                                this.emit('event', {
                                    type: 'message.received',
                                    channelType: 'imessage',
                                    channelId: this.id,
                                    timestamp: new Date(),
                                    payload: message,
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                this.emitError(error as Error, 'polling');
            }
        }, 2000); // Poll every 2 seconds
    }

    private async uploadAttachment(url: string): Promise<{ guid: string }> {
        // Fetch the file
        const response = await fetch(url);
        const blob = await response.blob();

        // Upload to BlueBubbles
        const formData = new FormData();
        formData.append('attachment', blob);

        const uploadResponse = await fetch(
            `${this.config.credentials.serverUrl}/api/v1/attachment/upload`,
            {
                method: 'POST',
                headers: {
                    'Authorization': this.config.credentials.password,
                },
                body: formData,
            }
        );

        const result = await uploadResponse.json() as { data?: { guid: string } };
        return { guid: result.data?.guid || '' };
    }

    private transformMessage(msg: BBMessage, isOutgoing: boolean): UnifiedMessage {
        const chatGuid = msg.chats?.[0]?.guid || 'unknown';

        return {
            id: this.generateMessageId(),
            channelType: 'imessage',
            channelId: this.id,
            platformMessageId: `${chatGuid}::${msg.guid}`,
            conversationId: this.generateConversationId(chatGuid),
            platformConversationId: chatGuid,
            sender: this.transformSender(msg.handle, msg.isFromMe),
            content: this.extractContent(msg),
            timestamp: new Date(msg.dateCreated),
            replyToId: msg.associatedMessageGuid,
            isOutgoing,
            raw: msg,
        };
    }

    private transformSender(handle: BBHandle | undefined, isFromMe: boolean): UnifiedSender {
        if (isFromMe) {
            return {
                id: 'imessage:me',
                platformId: 'me',
                displayName: 'Me',
            };
        }

        if (!handle) {
            return {
                id: 'imessage:unknown',
                platformId: 'unknown',
                displayName: 'Unknown',
            };
        }

        return {
            id: `imessage:${handle.id}`,
            platformId: handle.address,
            displayName: handle.address,
            username: handle.address,
        };
    }

    private extractContent(msg: BBMessage): MessageContent {
        // Check for attachments
        if (msg.attachments?.length) {
            const attachment = msg.attachments[0];
            const url = `${this.config.credentials.serverUrl}/api/v1/attachment/${attachment.guid}/download`;

            if (attachment.mimeType.startsWith('image/')) {
                return {
                    type: 'image',
                    url,
                    caption: msg.text || undefined,
                    mimeType: attachment.mimeType,
                    size: attachment.totalBytes,
                };
            }

            if (attachment.mimeType.startsWith('video/')) {
                return {
                    type: 'video',
                    url,
                    caption: msg.text || undefined,
                    mimeType: attachment.mimeType,
                    size: attachment.totalBytes,
                };
            }

            if (attachment.mimeType.startsWith('audio/')) {
                return {
                    type: 'audio',
                    url,
                    mimeType: attachment.mimeType,
                    size: attachment.totalBytes,
                };
            }

            return {
                type: 'file',
                url,
                filename: attachment.filename || attachment.transferName,
                mimeType: attachment.mimeType,
                size: attachment.totalBytes,
            };
        }

        // Check for tapback (reaction)
        if (msg.associatedMessageType && msg.associatedMessageType >= 2000) {
            return {
                type: 'reaction',
                emoji: this.tapbackToEmoji(msg.associatedMessageType),
                targetMessageId: msg.associatedMessageGuid || '',
            };
        }

        // Default to text
        return {
            type: 'text',
            text: msg.text || '',
        };
    }

    /**
     * Convert emoji to iMessage tapback type
     */
    private emojiToTapback(emoji: string): string {
        const map: Record<string, string> = {
            '❤️': 'love',
            '👍': 'like',
            '👎': 'dislike',
            '😂': 'laugh',
            '‼️': 'emphasize',
            '❓': 'question',
        };
        return map[emoji] || 'like';
    }

    /**
     * Convert iMessage tapback type to emoji
     */
    private tapbackToEmoji(type: number): string {
        const map: Record<number, string> = {
            2000: '❤️',  // Love
            2001: '👍',  // Like
            2002: '👎',  // Dislike
            2003: '😂',  // Laugh
            2004: '‼️',  // Emphasize
            2005: '❓',  // Question
        };
        return map[type] || '👍';
    }
}

/**
 * Create an iMessage adapter
 */
export function createiMessageAdapter(config: iMessageConfig): iMessageAdapter {
    return new iMessageAdapter(config);
}
