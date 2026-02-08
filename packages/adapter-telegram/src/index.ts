/**
 * BridgeKit Telegram Adapter
 * 
 * Integrates with Telegram Bot API using Grammy.
 * Supports both polling and webhook modes.
 */

import { Bot, Context, type Api, type RawApi } from 'grammy';
import {
    BaseAdapter,
    type ChannelConfig,
    type UnifiedMessage,
    type UnifiedSender,
    type MessageContent,
    type SendMessageOptions,
    type SendResult,
    type Conversation,
    type TextContent,
    type ImageContent,
    type VideoContent,
    type AudioContent,
    type FileContent,
    type LocationContent,
    type StickerContent,
} from '@bridgekit/core';

/**
 * Telegram-specific configuration
 */
export interface TelegramConfig extends ChannelConfig {
    type: 'telegram';
    credentials: {
        /** Bot token from @BotFather */
        token: string;
        /** Use webhooks instead of polling */
        useWebhook?: boolean;
        /** Webhook URL (required if useWebhook is true) */
        webhookUrl?: string;
        /** Webhook secret for verification */
        webhookSecret?: string;
    };
}

/**
 * Telegram adapter for BridgeKit
 * 
 * @example
 * ```typescript
 * const telegram = new TelegramAdapter({
 *   id: 'my-telegram-bot',
 *   type: 'telegram',
 *   name: 'My Telegram Bot',
 *   enabled: true,
 *   credentials: {
 *     token: process.env.TELEGRAM_BOT_TOKEN!,
 *   },
 * });
 * 
 * hub.registerAdapter(telegram);
 * ```
 */
export class TelegramAdapter extends BaseAdapter {
    readonly channelType = 'telegram' as const;

    private bot: Bot<Context>;
    protected override config: TelegramConfig;

    constructor(config: TelegramConfig) {
        super(config);
        this.config = config;
        this.bot = new Bot(config.credentials.token);

        this.setupHandlers();
    }

    // ===========================================================================
    // Lifecycle
    // ===========================================================================

    async connect(): Promise<void> {
        this.setState('connecting');

        try {
            // Verify bot token
            const me = await this.bot.api.getMe();
            console.log(`[Telegram] Connected as @${me.username}`);

            if (this.config.credentials.useWebhook && this.config.credentials.webhookUrl) {
                // Webhook mode
                await this.bot.api.setWebhook(this.config.credentials.webhookUrl, {
                    secret_token: this.config.credentials.webhookSecret,
                });
            } else {
                // Polling mode
                this.bot.start({
                    onStart: () => {
                        this.setState('connected');
                    },
                });
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
            await this.bot.stop();
            if (this.config.credentials.useWebhook) {
                await this.bot.api.deleteWebhook();
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
            const chatId = conversationId;
            const replyParams = options?.replyTo
                ? { reply_to_message_id: parseInt(options.replyTo, 10) }
                : {};

            let sentMessage;

            switch (content.type) {
                case 'text':
                    sentMessage = await this.bot.api.sendMessage(chatId, content.text, {
                        ...replyParams,
                        parse_mode: options?.parseMode === 'html' ? 'HTML' : 'MarkdownV2',
                    });
                    break;

                case 'image':
                    sentMessage = await this.bot.api.sendPhoto(chatId, content.url, {
                        ...replyParams,
                        caption: content.caption,
                    });
                    break;

                case 'video':
                    sentMessage = await this.bot.api.sendVideo(chatId, content.url, {
                        ...replyParams,
                        caption: content.caption,
                    });
                    break;

                case 'audio':
                    if (content.isVoiceNote) {
                        sentMessage = await this.bot.api.sendVoice(chatId, content.url, {
                            ...replyParams,
                        });
                    } else {
                        sentMessage = await this.bot.api.sendAudio(chatId, content.url, {
                            ...replyParams,
                        });
                    }
                    break;

                case 'file':
                    sentMessage = await this.bot.api.sendDocument(chatId, content.url, {
                        ...replyParams,
                        caption: content.caption,
                    });
                    break;

                case 'location':
                    sentMessage = await this.bot.api.sendLocation(
                        chatId,
                        content.latitude,
                        content.longitude,
                        replyParams
                    );
                    break;

                case 'sticker':
                    sentMessage = await this.bot.api.sendSticker(chatId, content.url, {
                        ...replyParams,
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
                message: this.transformMessage(sentMessage, true),
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
        try {
            // Telegram edit requires chat_id + message_id
            // For simplicity, we encode as "chatId:messageId"
            const [chatId, msgId] = messageId.split(':');

            if (content.type !== 'text') {
                return {
                    success: false,
                    error: new Error('Telegram only supports editing text messages'),
                };
            }

            const result = await this.bot.api.editMessageText(
                chatId,
                parseInt(msgId, 10),
                content.text
            );

            // editMessageText returns true for inline messages, Message otherwise
            if (typeof result === 'boolean') {
                return { success: true };
            }

            return {
                success: true,
                message: this.transformMessage(result, true),
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
            };
        }
    }

    async deleteMessage(messageId: string): Promise<void> {
        const [chatId, msgId] = messageId.split(':');
        await this.bot.api.deleteMessage(chatId, parseInt(msgId, 10));
    }

    // ===========================================================================
    // Reactions (Telegram supports reactions in newer versions)
    // ===========================================================================

    async addReaction(messageId: string, emoji: string): Promise<void> {
        const [chatId, msgId] = messageId.split(':');
        // Cast emoji to satisfy Grammy's strict emoji type
        await this.bot.api.setMessageReaction(chatId, parseInt(msgId, 10), [
            { type: 'emoji', emoji: emoji as any },
        ]);
    }

    async removeReaction(messageId: string, emoji: string): Promise<void> {
        const [chatId, msgId] = messageId.split(':');
        // Remove reaction by setting empty array
        await this.bot.api.setMessageReaction(chatId, parseInt(msgId, 10), []);
    }

    // ===========================================================================
    // Typing Indicator
    // ===========================================================================

    async sendTypingIndicator(conversationId: string): Promise<void> {
        await this.bot.api.sendChatAction(conversationId, 'typing');
    }

    // ===========================================================================
    // Conversation Methods
    // ===========================================================================

    async getConversation(conversationId: string): Promise<Conversation | null> {
        try {
            const chat = await this.bot.api.getChat(conversationId);

            return {
                id: this.generateConversationId(conversationId),
                channelType: 'telegram',
                channelId: this.id,
                platformConversationId: conversationId,
                title: 'title' in chat ? chat.title :
                    'first_name' in chat ? chat.first_name : 'Unknown',
                isGroup: chat.type === 'group' || chat.type === 'supergroup',
                metadata: { raw: chat },
            };
        } catch {
            return null;
        }
    }

    // ===========================================================================
    // Webhook Handler (for webhook mode)
    // ===========================================================================

    /**
     * Get the webhook callback handler for Express/Fastify/etc
     */
    getWebhookCallback() {
        // Grammy's webhookCallback signature varies by version
        return (this.bot as any).webhookCallback('secret', this.config.credentials.webhookSecret || 'secret');
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================

    private setupHandlers(): void {
        // Handle all messages
        this.bot.on('message', (ctx) => {
            const message = this.transformMessage(ctx.message, false);
            this.emit('message', message);
            this.emit('event', {
                type: 'message.received',
                channelType: 'telegram',
                channelId: this.id,
                timestamp: new Date(),
                payload: message,
            });
        });

        // Handle edited messages
        this.bot.on('edited_message', (ctx) => {
            if (!ctx.editedMessage) return;

            const message = this.transformMessage(ctx.editedMessage, false);
            this.emit('event', {
                type: 'message.edited',
                channelType: 'telegram',
                channelId: this.id,
                timestamp: new Date(),
                payload: {
                    message,
                    previousContent: { type: 'text' as const, text: '' }, // Telegram doesn't provide previous content
                },
            });
        });

        // Handle errors
        this.bot.catch((err) => {
            this.emitError(err.error as Error, err.ctx?.update?.update_id?.toString());
        });
    }

    private transformMessage(msg: any, isOutgoing: boolean): UnifiedMessage {
        const chatId = msg.chat.id.toString();
        const sender = this.transformSender(msg.from);

        return {
            id: this.generateMessageId(),
            channelType: 'telegram',
            channelId: this.id,
            platformMessageId: `${chatId}:${msg.message_id}`,
            conversationId: this.generateConversationId(chatId),
            platformConversationId: chatId,
            sender,
            content: this.extractContent(msg),
            timestamp: new Date(msg.date * 1000),
            editedAt: msg.edit_date ? new Date(msg.edit_date * 1000) : undefined,
            replyToId: msg.reply_to_message?.message_id?.toString(),
            threadId: msg.message_thread_id?.toString(),
            isOutgoing,
            raw: msg,
        };
    }

    private transformSender(user: any): UnifiedSender {
        if (!user) {
            return {
                id: 'unknown',
                platformId: 'unknown',
                displayName: 'Unknown',
            };
        }

        return {
            id: `telegram:${user.id}`,
            platformId: user.id.toString(),
            displayName: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown',
            username: user.username,
            isBot: user.is_bot,
        };
    }

    private extractContent(msg: any): MessageContent {
        // Text message
        if (msg.text) {
            return {
                type: 'text',
                text: msg.text,
                entities: msg.entities?.map((e: any) => ({
                    type: e.type,
                    offset: e.offset,
                    length: e.length,
                    data: e.url || e.user?.id?.toString(),
                })),
            };
        }

        // Photo
        if (msg.photo) {
            const photo = msg.photo[msg.photo.length - 1]; // Get largest size
            return {
                type: 'image',
                url: '', // Need to fetch via getFile
                caption: msg.caption,
                width: photo.width,
                height: photo.height,
                size: photo.file_size,
            };
        }

        // Video
        if (msg.video) {
            return {
                type: 'video',
                url: '', // Need to fetch via getFile
                caption: msg.caption,
                width: msg.video.width,
                height: msg.video.height,
                duration: msg.video.duration,
                size: msg.video.file_size,
                mimeType: msg.video.mime_type,
            };
        }

        // Voice
        if (msg.voice) {
            return {
                type: 'audio',
                url: '', // Need to fetch via getFile
                duration: msg.voice.duration,
                size: msg.voice.file_size,
                mimeType: msg.voice.mime_type,
                isVoiceNote: true,
            };
        }

        // Audio
        if (msg.audio) {
            return {
                type: 'audio',
                url: '', // Need to fetch via getFile
                duration: msg.audio.duration,
                size: msg.audio.file_size,
                mimeType: msg.audio.mime_type,
                isVoiceNote: false,
            };
        }

        // Document
        if (msg.document) {
            return {
                type: 'file',
                url: '', // Need to fetch via getFile
                filename: msg.document.file_name || 'document',
                mimeType: msg.document.mime_type || 'application/octet-stream',
                size: msg.document.file_size,
                caption: msg.caption,
            };
        }

        // Location
        if (msg.location) {
            return {
                type: 'location',
                latitude: msg.location.latitude,
                longitude: msg.location.longitude,
            };
        }

        // Sticker
        if (msg.sticker) {
            return {
                type: 'sticker',
                url: '', // Need to fetch via getFile
                emoji: msg.sticker.emoji,
                setName: msg.sticker.set_name,
                isAnimated: msg.sticker.is_animated,
            };
        }

        // Fallback for unsupported types
        return {
            type: 'text',
            text: '[Unsupported message type]',
        };
    }

    /**
     * Get file URL from Telegram file_id
     */
    async getFileUrl(fileId: string): Promise<string> {
        const file = await this.bot.api.getFile(fileId);
        return `https://api.telegram.org/file/bot${this.config.credentials.token}/${file.file_path}`;
    }
}

/**
 * Create a Telegram adapter
 */
export function createTelegramAdapter(config: TelegramConfig): TelegramAdapter {
    return new TelegramAdapter(config);
}
