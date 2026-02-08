/**
 * Allsend WhatsApp Adapter
 * 
 * Integrates with WhatsApp using whatsapp-web.js.
 * Requires QR code scanning for authentication.
 * 
 * NOTE: This uses the unofficial WhatsApp Web API.
 * For business use, consider the official WhatsApp Business API.
 */

import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
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
 * WhatsApp-specific configuration
 */
export interface WhatsAppConfig extends ChannelConfig {
    type: 'whatsapp';
    credentials: {
        /** Session data directory for persistence */
        sessionPath?: string;
        /** Client ID for multi-device support */
        clientId?: string;
        /** Custom QR code handler (default prints to terminal) */
        onQrCode?: (qr: string) => void;
    };
}

/**
 * WhatsApp adapter for Allsend
 * 
 * @example
 * ```typescript
 * const whatsapp = new WhatsAppAdapter({
 *   id: 'my-whatsapp',
 *   type: 'whatsapp',
 *   name: 'My WhatsApp',
 *   enabled: true,
 *   credentials: {
 *     sessionPath: './whatsapp-session',
 *   },
 * });
 * 
 * hub.registerAdapter(whatsapp);
 * ```
 */
export class WhatsAppAdapter extends BaseAdapter {
    readonly channelType = 'whatsapp' as const;

    private client: Client;
    protected override config: WhatsAppConfig;
    private ready: boolean = false;

    constructor(config: WhatsAppConfig) {
        super(config);
        this.config = config;

        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: config.credentials.sessionPath || './whatsapp-session',
                clientId: config.credentials.clientId,
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            },
        });

        this.setupHandlers();
    }

    // ===========================================================================
    // Lifecycle
    // ===========================================================================

    async connect(): Promise<void> {
        this.setState('connecting');

        try {
            await this.client.initialize();
            // 'ready' event will set state to 'connected'
        } catch (error) {
            this.setState('error');
            this.emitError(error as Error, 'connect');
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.destroy();
            this.ready = false;
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
        if (!this.ready) {
            return {
                success: false,
                error: new Error('WhatsApp client not ready'),
            };
        }

        try {
            let sentMessage: Message;
            const quotedMessageId = options?.replyTo;

            switch (content.type) {
                case 'text':
                    sentMessage = await this.client.sendMessage(conversationId, content.text, {
                        quotedMessageId,
                    });
                    break;

                case 'image':
                case 'video':
                case 'audio':
                case 'file':
                    const media = await MessageMedia.fromUrl(content.url, {
                        unsafeMime: true,
                    });
                    sentMessage = await this.client.sendMessage(conversationId, media, {
                        caption: 'caption' in content ? content.caption : undefined,
                        quotedMessageId,
                    });
                    break;

                case 'location':
                    // WhatsApp requires a special location message format
                    const locationMsg = `Location: ${content.latitude}, ${content.longitude}`;
                    sentMessage = await this.client.sendMessage(conversationId, locationMsg, {
                        quotedMessageId,
                    });
                    break;

                default:
                    return {
                        success: false,
                        error: new Error(`Unsupported content type: ${(content as MessageContent).type}`),
                    };
            }

            return {
                success: true,
                message: await this.transformMessage(sentMessage, true),
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
        // WhatsApp doesn't support message editing via web API
        return {
            success: false,
            error: new Error('WhatsApp does not support message editing'),
        };
    }

    async deleteMessage(messageId: string): Promise<void> {
        // Message deletion requires access to the original Message object
        // This is a limitation of whatsapp-web.js
        throw new Error('Message deletion requires original message reference');
    }

    // ===========================================================================
    // Reactions
    // ===========================================================================

    async addReaction(messageId: string, emoji: string): Promise<void> {
        // Reactions require the original Message object
        throw new Error('Reactions require original message reference');
    }

    // ===========================================================================
    // Typing Indicator
    // ===========================================================================

    async sendTypingIndicator(conversationId: string): Promise<void> {
        const chat = await this.client.getChatById(conversationId);
        await chat.sendStateTyping();
    }

    // ===========================================================================
    // Conversation Methods
    // ===========================================================================

    async getConversation(conversationId: string): Promise<Conversation | null> {
        try {
            const chat = await this.client.getChatById(conversationId);

            return {
                id: this.generateConversationId(conversationId),
                channelType: 'whatsapp',
                channelId: this.id,
                platformConversationId: conversationId,
                title: chat.name,
                isGroup: chat.isGroup,
                lastMessageAt: chat.timestamp ? new Date(chat.timestamp * 1000) : undefined,
                metadata: {
                    unreadCount: chat.unreadCount,
                    isArchived: chat.archived,
                    isMuted: chat.isMuted,
                },
            };
        } catch {
            return null;
        }
    }

    async listConversations(limit = 50): Promise<Conversation[]> {
        const chats = await this.client.getChats();

        return chats.slice(0, limit).map((chat) => ({
            id: this.generateConversationId(chat.id._serialized),
            channelType: 'whatsapp' as const,
            channelId: this.id,
            platformConversationId: chat.id._serialized,
            title: chat.name,
            isGroup: chat.isGroup,
            lastMessageAt: chat.timestamp ? new Date(chat.timestamp * 1000) : undefined,
        }));
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================

    private setupHandlers(): void {
        // QR Code for authentication
        this.client.on('qr', (qr) => {
            if (this.config.credentials.onQrCode) {
                this.config.credentials.onQrCode(qr);
            } else {
                console.log('[WhatsApp] Scan this QR code to authenticate:');
                qrcode.generate(qr, { small: true });
            }
        });

        this.client.on('ready', () => {
            console.log('[WhatsApp] Client is ready');
            this.ready = true;
            this.setState('connected');
        });

        this.client.on('authenticated', () => {
            console.log('[WhatsApp] Authenticated successfully');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('[WhatsApp] Authentication failed:', msg);
            this.setState('error');
            this.emitError(new Error(`Auth failed: ${msg}`), 'auth');
        });

        this.client.on('disconnected', (reason) => {
            console.log('[WhatsApp] Disconnected:', reason);
            this.ready = false;
            this.setState('disconnected', reason);
        });

        this.client.on('message', async (msg) => {
            // Skip status messages
            if (msg.isStatus) return;

            const unifiedMessage = await this.transformMessage(msg, false);
            this.emit('message', unifiedMessage);
            this.emit('event', {
                type: 'message.received',
                channelType: 'whatsapp',
                channelId: this.id,
                timestamp: new Date(),
                payload: unifiedMessage,
            });
        });

        this.client.on('message_ack', (msg, ack) => {
            // ack levels: -1 = error, 0 = pending, 1 = sent, 2 = received, 3 = read
            if (ack >= 2) {
                // Transform to a UnifiedMessage for proper payload type
                this.transformMessage(msg, true).then((message) => {
                    this.emit('event', {
                        type: 'message.sent',
                        channelType: 'whatsapp',
                        channelId: this.id,
                        timestamp: new Date(),
                        payload: message,
                    });
                });
            }
        });

        this.client.on('message_reaction', async (reaction) => {
            this.emit('event', {
                type: reaction.reaction ? 'reaction.added' : 'reaction.removed',
                channelType: 'whatsapp',
                channelId: this.id,
                timestamp: new Date(),
                payload: {
                    messageId: reaction.msgId._serialized,
                    emoji: reaction.reaction || '',
                    userId: reaction.senderId,
                },
            });
        });
    }

    private async transformMessage(msg: Message, isOutgoing: boolean): Promise<UnifiedMessage> {
        const contact = await msg.getContact();
        const chat = await msg.getChat();

        return {
            id: this.generateMessageId(),
            channelType: 'whatsapp',
            channelId: this.id,
            platformMessageId: msg.id._serialized,
            conversationId: this.generateConversationId(chat.id._serialized),
            platformConversationId: chat.id._serialized,
            sender: this.transformSender(contact, msg.author),
            content: await this.extractContent(msg),
            timestamp: new Date(msg.timestamp * 1000),
            replyToId: msg.hasQuotedMsg ? (await msg.getQuotedMessage())?.id._serialized : undefined,
            isOutgoing,
            raw: msg,
        };
    }

    private transformSender(contact: any, author?: string): UnifiedSender {
        return {
            id: `whatsapp:${contact.id._serialized}`,
            platformId: contact.id._serialized,
            displayName: contact.pushname || contact.name || contact.number || 'Unknown',
            username: contact.number,
            avatarUrl: undefined, // Would need getProfilePicUrl
            isBot: false,
        };
    }

    private async extractContent(msg: Message): Promise<MessageContent> {
        // Check for media
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();

            if (media) {
                const dataUrl = `data:${media.mimetype};base64,${media.data}`;

                if (media.mimetype.startsWith('image/')) {
                    return {
                        type: 'image',
                        url: dataUrl,
                        caption: msg.body || undefined,
                        mimeType: media.mimetype,
                    };
                }

                if (media.mimetype.startsWith('video/')) {
                    return {
                        type: 'video',
                        url: dataUrl,
                        caption: msg.body || undefined,
                        mimeType: media.mimetype,
                    };
                }

                if (media.mimetype.startsWith('audio/')) {
                    return {
                        type: 'audio',
                        url: dataUrl,
                        mimeType: media.mimetype,
                        isVoiceNote: msg.type === 'ptt',
                    };
                }

                return {
                    type: 'file',
                    url: dataUrl,
                    filename: media.filename || 'file',
                    mimeType: media.mimetype,
                };
            }
        }

        // Check for location
        if (msg.location) {
            return {
                type: 'location',
                latitude: Number(msg.location.latitude),
                longitude: Number(msg.location.longitude),
                title: msg.location.description,
            };
        }

        // Check for contact
        if (msg.type === 'vcard') {
            return {
                type: 'contact',
                name: 'Contact',
                vCard: msg.body,
            };
        }

        // Check for sticker
        if (msg.type === 'sticker') {
            const media = await msg.downloadMedia();
            return {
                type: 'sticker',
                url: media ? `data:${media.mimetype};base64,${media.data}` : '',
                isAnimated: false,
            };
        }

        // Default to text
        return {
            type: 'text',
            text: msg.body,
        };
    }
}

/**
 * Create a WhatsApp adapter
 */
export function createWhatsAppAdapter(config: WhatsAppConfig): WhatsAppAdapter {
    return new WhatsAppAdapter(config);
}
