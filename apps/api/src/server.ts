/**
 * Allsend API Server
 * 
 * Production API server for Allsend with Convex integration.
 * Provides HTTP endpoints for sending messages and monitoring channel status.
 */

import { createHub } from '@allsend/core';
import { TelegramAdapter } from '@allsend/adapter-telegram';
import { DiscordAdapter } from '@allsend/adapter-discord';
import { WhatsAppAdapter } from '@allsend/adapter-whatsapp';
import { iMessageAdapter } from '@allsend/adapter-imessage';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

// Initialize Convex client
const convexUrl = process.env.CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

if (!convex) {
    console.warn('⚠️  CONVEX_URL not set - data will not sync to dashboard');
}

// Create the hub
const hub = createHub();

// Helper to sync channel status to Convex
async function syncChannelToConvex(
    id: string,
    status: 'connected' | 'disconnected' | 'connecting' | 'error',
    error?: string
) {
    if (!convex) return;
    try {
        await convex.mutation(api.channels.updateStatus, {
            channelId: id as any,
            status,
            lastError: error,
        });
    } catch (e) {
        // console.error('Failed to sync channel status:', e);
    }
}

// Helper to store incoming message
async function storeIncomingMessage(
    channelId: any,
    channelType: string,
    platformMessageId: string,
    conversationId: string,
    senderName: string,
    senderPlatformId: string,
    content: string,
    contentType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker',
    isOutgoing: boolean,
    conversationTitle?: string,
    isGroup?: boolean
) {
    if (!convex) return;
    try {
        // 1. Get or create conversation to get Convex ID
        const convexConversationId = await convex.mutation(api.conversations.getOrCreate, {
            channelId,
            channelType,
            platformConversationId: conversationId,
            title: conversationTitle,
            isGroup: isGroup ?? false,
        });

        if (!convexConversationId) return;

        // 2. Store message
        await convex.mutation(api.messages.receive, {
            conversationId: convexConversationId,
            channelType,
            platformMessageId,
            senderId: senderPlatformId,
            senderName,
            senderAvatarUrl: undefined,
            isBot: false,
            contentType,
            content: { text: content }, // Basic content wrapper
            isOutgoing: false, // Incoming is never outgoing
            timestamp: Date.now(),
        });

        // 3. Increment unread count for incoming
        await convex.mutation(api.conversations.incrementUnread, { id: convexConversationId });

    } catch (e) {
        console.error('Failed to store incoming message in Convex:', e);
    }
}

// Helper to store outgoing message
async function storeOutgoingMessage(
    channelId: any,
    channelType: string,
    platformMessageId: string,
    conversationId: string, // This is platform conversation ID
    content: string,
    contentType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker',
) {
    if (!convex) return;
    try {
        // 1. Get existing conversation ID
        // Note `getOrCreate` is safe here too
        const convexConversationId = await convex.mutation(api.conversations.getOrCreate, {
            channelId,
            channelType,
            platformConversationId: conversationId,
            isGroup: false, // defaulting
        });

        await convex.mutation(api.messages.send, {
            conversationId: convexConversationId,
            channelType,
            platformMessageId,
            contentType,
            content: { text: content },
            timestamp: Date.now(),
        });

    } catch (e) {
        console.error('Failed to store outgoing message in Convex:', e);
    }
}


// Initialize Adapters
async function initializeAdapters() {
    // 1. Load from Convex (Primary)
    if (convex) {
        try {
            const channels = await convex.query(api.channels.list);
            console.log(`Loading ${channels.length} channels from Convex...`);

            for (const channel of channels) {
                if (hub.getAdapter(channel._id)) continue; // Already registered

                try {
                    let adapter;
                    const credentials = channel.credentials ? JSON.parse(channel.credentials) : {};

                    switch (channel.type) {
                        case 'telegram':
                            if (credentials.token) {
                                adapter = new TelegramAdapter({
                                    id: channel._id,
                                    type: 'telegram',
                                    name: channel.name,
                                    enabled: true,
                                    credentials: { token: credentials.token },
                                });
                            }
                            break;

                        case 'discord':
                            if (credentials.token) {
                                adapter = new DiscordAdapter({
                                    id: channel._id,
                                    type: 'discord',
                                    name: channel.name,
                                    enabled: true,
                                    credentials: {
                                        token: credentials.token,
                                        guildIds: credentials.guildIds,
                                    },
                                });
                            }
                            break;

                        case 'whatsapp':
                            // Fixed: Config now matches what we likely have or want to support.
                            // Since dashboard doesn't ask for session path, we generate one.
                            if (credentials.clientId || credentials.sessionPath || true) { // Always try if type is whatsapp
                                adapter = new WhatsAppAdapter({
                                    id: channel._id,
                                    type: 'whatsapp',
                                    name: channel.name,
                                    enabled: true,
                                    credentials: {
                                        clientId: credentials.clientId,
                                        sessionPath: credentials.sessionPath || `./.wwebjs_auth/session-${channel._id}`,
                                        onQrCode: (qr) => console.log(`[WhatsApp ${channel.name}] QR Code:`, qr),
                                    },
                                });
                            }
                            break;

                        case 'imessage':
                            if (credentials.serverUrl) {
                                adapter = new iMessageAdapter({
                                    id: channel._id,
                                    type: 'imessage',
                                    name: channel.name,
                                    enabled: true,
                                    credentials: {
                                        serverUrl: credentials.serverUrl,
                                        password: credentials.password,
                                    },
                                });
                            }
                            break;
                    }

                    if (adapter) {
                        hub.registerAdapter(adapter);
                        console.log(`✓ Registered ${channel.type} adapter: ${channel.name}`);

                        // Initial sync
                        await syncChannelToConvex(channel._id, 'connecting');
                        await adapter.connect(); // Actually connect
                    }
                } catch (err) {
                    console.error(`Failed to initialize channel ${channel.name}:`, err);
                    await syncChannelToConvex(channel._id, 'error', String(err));
                }
            }
        } catch (e) {
            console.error('Failed to load channels from Convex:', e);
        }
    }

    // 2. Load from Env (Legacy/Fallback)
    if (process.env.TELEGRAM_BOT_TOKEN) {
        const hasTelegram = hub.getAllAdapters().some(a => a.channelType === 'telegram');

        if (!hasTelegram) {
            console.log('Registering Telegram from env var...');
            const telegram = new TelegramAdapter({
                id: 'telegram-env',
                type: 'telegram',
                name: 'Telegram (Env)',
                enabled: true,
                credentials: {
                    token: process.env.TELEGRAM_BOT_TOKEN,
                },
            });
            hub.registerAdapter(telegram);
            await telegram.connect();
        }
    }
}

// Handle adapter connections
hub.on('adapter:connected', async (adapterId, channelType) => {
    console.log(`✅ ${channelType} adapter connected (${adapterId})`);
    if (convex && adapterId !== 'telegram-env') {
        await syncChannelToConvex(adapterId, 'connected');
    }
});

hub.on('adapter:disconnected', async (adapterId, channelType, reason) => {
    console.log(`❌ ${channelType} adapter disconnected: ${reason}`);
    if (convex && adapterId !== 'telegram-env') {
        await syncChannelToConvex(adapterId, 'disconnected', reason);
    }
});

hub.on('adapter:error', async (adapterId, error, context) => {
    console.error(`⚠️ Error in ${adapterId}: ${error.message} (${context})`);
    if (convex && adapterId !== 'telegram-env') {
        // Optionally sync error state
        await syncChannelToConvex(adapterId, 'error', error.message);
    }
});

// Handle incoming messages
hub.on('message', async (message) => {
    const contentText = message.content.type === 'text'
        ? message.content.text
        : `[${message.content.type}]`;

    console.log(`[${message.channelType}] ${message.sender.displayName}: ${contentText}`);

    // Store in Convex
    if (convex && message.channelId !== 'telegram-env') {
        await storeIncomingMessage(
            message.channelId,
            message.channelType,
            message.platformMessageId,
            message.conversationId,
            message.sender.displayName,
            message.sender.platformId,
            contentText,
            message.content.type as any,
            message.isOutgoing,
            // Try to guess title or group status if available in message context
            undefined, // title
            message.conversationId.includes('g') // heuristic for group? 
        );
    }

    // Echo/Help logic (Demo)
    if (message.content.type === 'text') {
        if (message.content.text.startsWith('/echo ')) {
            const echoText = message.content.text.slice(6);
            hub.reply(message, { type: 'text', text: `Echo: ${echoText}` });
        } else if (message.content.text === '/help') {
            hub.reply(message, {
                type: 'text',
                text: `🤖 Allsend Bot\n\nConnected via ${message.channelType}`,
            });
        }
    }
});

// Handle events
hub.on('event', async (event) => {
    console.log(`[Event] ${event.type} from ${event.channelType}`);
    // Log event to Convex
    if (convex) {
        try {
            await convex.mutation(api.events.log, {
                type: event.type,
                channelType: event.channelType,
                payload: { ...event, type: undefined }, // avoid type collision if needed, or just pass clean object
            });
        } catch (e) {
            // ignore
        }
    }
});

// HTTP server
const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);

        // CORS
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'ok',
                convex: !!convex,
                adapters: hub.getAllAdapters().map((a) => ({
                    id: a.id,
                    type: a.channelType,
                    connected: a.isConnected,
                })),
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (url.pathname === '/api/send' && req.method === 'POST') {
            try {
                const body = await req.json() as {
                    conversationId: string;
                    channelType: string;
                    content: string;
                };

                const adapter = hub.getAllAdapters().find(a =>
                    a.channelType === body.channelType && a.isConnected
                );

                if (!adapter) {
                    return new Response(JSON.stringify({ success: false, error: 'No adapter found' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                let chatId = body.conversationId;
                if (body.conversationId.includes(':')) {
                    const parts = body.conversationId.split(':');
                    chatId = parts[parts.length - 1];
                }

                const result = await adapter.sendMessage(chatId, { type: 'text', text: body.content });

                if (result.success && convex && adapter.id !== 'telegram-env') {
                    await storeOutgoingMessage(
                        adapter.id,
                        body.channelType,
                        result.message?.platformMessageId || '',
                        body.conversationId,
                        body.content,
                        'text',
                    );
                }

                return new Response(JSON.stringify({ success: result.success }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

            } catch (e) {
                return new Response(JSON.stringify({ error: String(e) }),
                    { status: 500, headers: corsHeaders });
            }
        }

        return new Response('Allsend API Server', { headers: corsHeaders });
    },
});

console.log(`🚀 Allsend API server running on http://localhost:${server.port}`);

// Initial load
initializeAdapters().then(() => {
    // Start adapters? connect() called individually
    console.log('Hub initialized');
});

// Setup periodic refresh
setInterval(initializeAdapters, 60000); // Check every minute
