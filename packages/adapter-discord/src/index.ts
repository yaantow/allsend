/**
 * BridgeKit Discord Adapter
 * 
 * Integrates with Discord Gateway using discord.js.
 * Supports text channels, DMs, threads, and reactions.
 */

import {
    Client,
    GatewayIntentBits,
    Message,
    TextChannel,
    DMChannel,
    ThreadChannel,
    User,
    Partials,
    type MessageCreateOptions,
} from 'discord.js';
import {
    BaseAdapter,
    type ChannelConfig,
    type UnifiedMessage,
    type UnifiedSender,
    type MessageContent,
    type SendMessageOptions,
    type SendResult,
    type Conversation,
} from '@bridgekit/core';

/**
 * Discord-specific configuration
 */
export interface DiscordConfig extends ChannelConfig {
    type: 'discord';
    credentials: {
        /** Bot token from Discord Developer Portal */
        token: string;
        /** Optional: specific guild IDs to listen to (all if empty) */
        guildIds?: string[];
    };
}

/**
 * Discord adapter for BridgeKit
 * 
 * @example
 * ```typescript
 * const discord = new DiscordAdapter({
 *   id: 'my-discord-bot',
 *   type: 'discord',
 *   name: 'My Discord Bot',
 *   enabled: true,
 *   credentials: {
 *     token: process.env.DISCORD_BOT_TOKEN!,
 *   },
 * });
 * 
 * hub.registerAdapter(discord);
 * ```
 */
export class DiscordAdapter extends BaseAdapter {
    readonly channelType = 'discord' as const;

    private client: Client;
    protected override config: DiscordConfig;

    constructor(config: DiscordConfig) {
        super(config);
        this.config = config;

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.MessageContent,
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
            ],
        });

        this.setupHandlers();
    }

    // ===========================================================================
    // Lifecycle
    // ===========================================================================

    async connect(): Promise<void> {
        this.setState('connecting');

        try {
            await this.client.login(this.config.credentials.token);
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
            const channel = await this.client.channels.fetch(conversationId);

            if (!channel || !this.isTextBasedChannel(channel)) {
                return {
                    success: false,
                    error: new Error(`Channel ${conversationId} not found or not text-based`),
                };
            }

            const messageOptions = this.buildMessageOptions(content, options);
            const sentMessage = await channel.send(messageOptions);

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
            const [channelId, msgId] = messageId.split(':');
            const channel = await this.client.channels.fetch(channelId);

            if (!channel || !this.isTextBasedChannel(channel)) {
                return {
                    success: false,
                    error: new Error(`Channel ${channelId} not found`),
                };
            }

            const message = await channel.messages.fetch(msgId);

            // Build edit content separately (edit doesn't support all create options)
            let editContent: string | undefined;
            if (content.type === 'text') {
                editContent = content.text;
            } else {
                editContent = '[Unsupported content type]';
            }

            const editedMessage = await message.edit(editContent);

            return {
                success: true,
                message: this.transformMessage(editedMessage, true),
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
            };
        }
    }

    async deleteMessage(messageId: string): Promise<void> {
        const [channelId, msgId] = messageId.split(':');
        const channel = await this.client.channels.fetch(channelId);

        if (channel && this.isTextBasedChannel(channel)) {
            const message = await channel.messages.fetch(msgId);
            await message.delete();
        }
    }

    // ===========================================================================
    // Reactions
    // ===========================================================================

    async addReaction(messageId: string, emoji: string): Promise<void> {
        const [channelId, msgId] = messageId.split(':');
        const channel = await this.client.channels.fetch(channelId);

        if (channel && this.isTextBasedChannel(channel)) {
            const message = await channel.messages.fetch(msgId);
            await message.react(emoji);
        }
    }

    async removeReaction(messageId: string, emoji: string): Promise<void> {
        const [channelId, msgId] = messageId.split(':');
        const channel = await this.client.channels.fetch(channelId);

        if (channel && this.isTextBasedChannel(channel)) {
            const message = await channel.messages.fetch(msgId);
            const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
            if (reaction && this.client.user) {
                await reaction.users.remove(this.client.user.id);
            }
        }
    }

    // ===========================================================================
    // Typing Indicator
    // ===========================================================================

    async sendTypingIndicator(conversationId: string): Promise<void> {
        const channel = await this.client.channels.fetch(conversationId);
        if (channel && this.isTextBasedChannel(channel)) {
            await channel.sendTyping();
        }
    }

    // ===========================================================================
    // Conversation Methods
    // ===========================================================================

    async getConversation(conversationId: string): Promise<Conversation | null> {
        try {
            const channel = await this.client.channels.fetch(conversationId);
            if (!channel) return null;

            const isGroup = channel.type !== 1; // DM type is 1
            let title = 'Unknown';

            if ('name' in channel && channel.name) {
                title = channel.name;
            } else if (channel.type === 1 && 'recipient' in channel) {
                title = (channel as DMChannel).recipient?.username || 'DM';
            }

            return {
                id: this.generateConversationId(conversationId),
                channelType: 'discord',
                channelId: this.id,
                platformConversationId: conversationId,
                title,
                isGroup,
                metadata: { type: channel.type },
            };
        } catch {
            return null;
        }
    }

    async listConversations(limit = 50): Promise<Conversation[]> {
        const conversations: Conversation[] = [];

        // Get all guilds the bot is in
        for (const [, guild] of this.client.guilds.cache) {
            // Filter by guildIds if specified
            if (
                this.config.credentials.guildIds?.length &&
                !this.config.credentials.guildIds.includes(guild.id)
            ) {
                continue;
            }

            // Get text channels
            const channels = guild.channels.cache.filter(
                (c) => c.isTextBased() && 'name' in c
            );

            for (const [, channel] of channels) {
                if (conversations.length >= limit) break;

                conversations.push({
                    id: this.generateConversationId(channel.id),
                    channelType: 'discord',
                    channelId: this.id,
                    platformConversationId: channel.id,
                    title: 'name' in channel ? channel.name || 'Unknown' : 'Unknown',
                    isGroup: true,
                    metadata: {
                        guildId: guild.id,
                        guildName: guild.name,
                    },
                });
            }
        }

        return conversations;
    }

    // ===========================================================================
    // Private Helpers
    // ===========================================================================

    private setupHandlers(): void {
        this.client.once('ready', (client) => {
            console.log(`[Discord] Connected as ${client.user.tag}`);
            this.setState('connected');
        });

        this.client.on('messageCreate', (message) => {
            // Ignore bot's own messages
            if (message.author.id === this.client.user?.id) return;

            // Filter by guildIds if specified
            if (
                message.guild &&
                this.config.credentials.guildIds?.length &&
                !this.config.credentials.guildIds.includes(message.guild.id)
            ) {
                return;
            }

            const unifiedMessage = this.transformMessage(message, false);
            this.emit('message', unifiedMessage);
            this.emit('event', {
                type: 'message.received',
                channelType: 'discord',
                channelId: this.id,
                timestamp: new Date(),
                payload: unifiedMessage,
            });
        });

        this.client.on('messageUpdate', (oldMessage, newMessage) => {
            if (!newMessage.author || newMessage.author.id === this.client.user?.id) return;

            const message = this.transformMessage(newMessage as Message, false);
            this.emit('event', {
                type: 'message.edited',
                channelType: 'discord',
                channelId: this.id,
                timestamp: new Date(),
                payload: {
                    message,
                    previousContent: oldMessage.content
                        ? { type: 'text' as const, text: oldMessage.content }
                        : { type: 'text' as const, text: '' },
                },
            });
        });

        this.client.on('messageDelete', (message) => {
            this.emit('event', {
                type: 'message.deleted',
                channelType: 'discord',
                channelId: this.id,
                timestamp: new Date(),
                payload: {
                    messageId: `${message.channelId}:${message.id}`,
                    conversationId: this.generateConversationId(message.channelId),
                },
            });
        });

        this.client.on('messageReactionAdd', (reaction, user) => {
            this.emit('event', {
                type: 'reaction.added',
                channelType: 'discord',
                channelId: this.id,
                timestamp: new Date(),
                payload: {
                    messageId: `${reaction.message.channelId}:${reaction.message.id}`,
                    emoji: reaction.emoji.name || '',
                    userId: user.id,
                },
            });
        });

        this.client.on('messageReactionRemove', (reaction, user) => {
            this.emit('event', {
                type: 'reaction.removed',
                channelType: 'discord',
                channelId: this.id,
                timestamp: new Date(),
                payload: {
                    messageId: `${reaction.message.channelId}:${reaction.message.id}`,
                    emoji: reaction.emoji.name || '',
                    userId: user.id,
                },
            });
        });

        this.client.on('typingStart', (typing) => {
            this.emit('event', {
                type: 'typing.start',
                channelType: 'discord',
                channelId: this.id,
                timestamp: new Date(),
                payload: {
                    conversationId: this.generateConversationId(typing.channel.id),
                    userId: typing.user.id,
                },
            });
        });

        this.client.on('error', (error) => {
            this.emitError(error, 'client');
        });
    }

    private isTextBasedChannel(
        channel: any
    ): channel is TextChannel | DMChannel | ThreadChannel {
        return channel.isTextBased();
    }

    private transformMessage(msg: Message, isOutgoing: boolean): UnifiedMessage {
        return {
            id: this.generateMessageId(),
            channelType: 'discord',
            channelId: this.id,
            platformMessageId: `${msg.channelId}:${msg.id}`,
            conversationId: this.generateConversationId(msg.channelId),
            platformConversationId: msg.channelId,
            sender: this.transformSender(msg.author),
            content: this.extractContent(msg),
            timestamp: msg.createdAt,
            editedAt: msg.editedAt || undefined,
            replyToId: msg.reference?.messageId,
            threadId: msg.thread?.id,
            isOutgoing,
            raw: msg,
        };
    }

    private transformSender(user: User): UnifiedSender {
        return {
            id: `discord:${user.id}`,
            platformId: user.id,
            displayName: user.displayName || user.username,
            username: user.username,
            avatarUrl: user.displayAvatarURL(),
            isBot: user.bot,
        };
    }

    private extractContent(msg: Message): MessageContent {
        // Check for attachments first
        if (msg.attachments.size > 0) {
            const attachment = msg.attachments.first()!;
            const mimeType = attachment.contentType || 'application/octet-stream';

            if (mimeType.startsWith('image/')) {
                return {
                    type: 'image',
                    url: attachment.url,
                    caption: msg.content || undefined,
                    width: attachment.width || undefined,
                    height: attachment.height || undefined,
                    size: attachment.size,
                    mimeType,
                };
            }

            if (mimeType.startsWith('video/')) {
                return {
                    type: 'video',
                    url: attachment.url,
                    caption: msg.content || undefined,
                    width: attachment.width || undefined,
                    height: attachment.height || undefined,
                    size: attachment.size,
                    mimeType,
                };
            }

            if (mimeType.startsWith('audio/')) {
                return {
                    type: 'audio',
                    url: attachment.url,
                    size: attachment.size,
                    mimeType,
                };
            }

            // Generic file
            return {
                type: 'file',
                url: attachment.url,
                filename: attachment.name || 'file',
                mimeType,
                size: attachment.size,
                caption: msg.content || undefined,
            };
        }

        // Check for stickers
        if (msg.stickers.size > 0) {
            const sticker = msg.stickers.first()!;
            return {
                type: 'sticker',
                url: sticker.url,
                emoji: sticker.tags ?? undefined,
            };
        }

        // Default to text
        return {
            type: 'text',
            text: msg.content,
        };
    }

    private buildMessageOptions(
        content: MessageContent,
        options?: SendMessageOptions
    ): MessageCreateOptions {
        const messageOptions: MessageCreateOptions = {};

        // Handle reply
        if (options?.replyTo) {
            messageOptions.reply = {
                messageReference: options.replyTo,
            };
        }

        switch (content.type) {
            case 'text':
                messageOptions.content = content.text;
                break;

            case 'image':
            case 'video':
            case 'audio':
            case 'file':
                messageOptions.files = [{ attachment: content.url }];
                if ('caption' in content && content.caption) {
                    messageOptions.content = content.caption;
                }
                break;

            default:
                messageOptions.content = '[Unsupported content type]';
        }

        return messageOptions;
    }
}

/**
 * Create a Discord adapter
 */
export function createDiscordAdapter(config: DiscordConfig): DiscordAdapter {
    return new DiscordAdapter(config);
}
