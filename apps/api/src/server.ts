/**
 * BridgeKit API Server
 * 
 * Production API server for BridgeKit with Convex integration.
 * Provides HTTP endpoints for sending messages and monitoring channel status.
 */

import { ChannelHub, createHub } from '@bridgekit/core';
import { TelegramAdapter } from '@bridgekit/adapter-telegram';
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
    name: string,
    type: 'telegram' | 'discord' | 'whatsapp' | 'imessage',
    status: 'connected' | 'disconnected' | 'connecting' | 'error',
    error?: string
) {
    if (!convex) return;
    try {
        await convex.mutation(api.channels.upsert, {
            name,
            type,
            status,
            lastConnectedAt: status === 'connected' ? Date.now() : undefined,
            lastError: error,
        });
    } catch (e) {
        console.error('Failed to sync channel to Convex:', e);
    }
}

// Helper to store message in Convex
async function storeMessageInConvex(
    channelId: any,
    channelType: string,
    platformMessageId: string,
    conversationId: string,
    senderName: string,
    senderPlatformId: string,
    content: string,
    contentType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker',
    isOutgoing: boolean
) {
    if (!convex) return;
    try {
        await convex.mutation(api.messages.store, {
            channelId,
            channelType,
            platformMessageId,
            conversationId,
            senderName,
            senderPlatformId,
            content,
            contentType,
            isOutgoing,
            timestamp: Date.now(),
        });
    } catch (e) {
        console.error('Failed to store message in Convex:', e);
    }
}

// Register Telegram adapter
let telegramChannelId: any = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
    const telegram = new TelegramAdapter({
        id: 'telegram-main',
        type: 'telegram',
        name: 'Main Telegram Bot',
        enabled: true,
        credentials: {
            token: process.env.TELEGRAM_BOT_TOKEN,
        },
    });

    hub.registerAdapter(telegram);
    console.log('✓ Telegram adapter registered');

    // Sync initial status
    syncChannelToConvex('Main Telegram Bot', 'telegram', 'connecting');
}

// Handle adapter connections
hub.on('adapter:connected', async (adapterId, channelType) => {
    console.log(`✅ ${channelType} adapter connected (${adapterId})`);

    if (channelType === 'telegram') {
        // Get or create channel ID from Convex
        if (convex) {
            try {
                const channels = await convex.query(api.channels.getByType, { type: 'telegram' });
                if (channels.length > 0) {
                    telegramChannelId = channels[0]._id;
                }
            } catch (e) {
                console.error('Failed to get channel ID:', e);
            }
        }
        await syncChannelToConvex('Main Telegram Bot', 'telegram', 'connected');
    }
});

hub.on('adapter:disconnected', (adapterId, channelType, reason) => {
    console.log(`❌ ${channelType} adapter disconnected: ${reason}`);

    if (channelType === 'telegram') {
        syncChannelToConvex('Main Telegram Bot', 'telegram', 'disconnected', reason);
    }
});

hub.on('adapter:error', (adapterId, error, context) => {
    console.error(`⚠️ Error in ${adapterId}: ${error.message} (${context})`);
});

// Handle incoming messages from any channel
hub.on('message', async (message) => {
    const contentText = message.content.type === 'text'
        ? message.content.text
        : `[${message.content.type}]`;

    console.log(`[${message.channelType}] ${message.sender.displayName}: ${contentText}`);

    // Store message in Convex
    if (telegramChannelId && message.channelType === 'telegram') {
        await storeMessageInConvex(
            telegramChannelId,
            message.channelType,
            message.platformMessageId,
            message.conversationId,
            message.sender.displayName,
            message.sender.platformId,
            contentText,
            message.content.type as any,
            message.isOutgoing
        );
    }

    // Example: Echo messages back
    if (message.content.type === 'text' && message.content.text.startsWith('/echo ')) {
        const echoText = message.content.text.slice(6);
        hub.reply(message, { type: 'text', text: `Echo: ${echoText}` });
    }

    // Example: Respond to /help command
    if (message.content.type === 'text' && message.content.text === '/help') {
        hub.reply(message, {
            type: 'text',
            text: `🤖 BridgeKit Bot

Available commands:
• /echo <text> - Echo your message back
• /help - Show this help message
• /ping - Check if the bot is alive

Connected via ${message.channelType}`,
        });
    }

    // Example: Ping command
    if (message.content.type === 'text' && message.content.text === '/ping') {
        hub.reply(message, { type: 'text', text: '🏓 Pong!' });
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
            });
        } catch (e) {
            // Silently ignore event logging errors
        }
    }
});

// HTTP server for API endpoints
const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);

        // CORS headers for dashboard
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (url.pathname === '/health') {
            return new Response(JSON.stringify({
                status: 'ok',
                convex: !!convex,
                adapters: hub.getAllAdapters().map((a) => ({
                    id: a.id,
                    type: a.channelType,
                    connected: a.isConnected,
                })),
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Send message from dashboard
        if (url.pathname === '/api/send' && req.method === 'POST') {
            try {
                const body = await req.json() as {
                    conversationId: string;
                    channelType: string;
                    content: string;
                };

                console.log(`[Dashboard] Sending to ${body.conversationId}: ${body.content}`);

                // Find the adapter for this channel type
                const adapter = hub.getAllAdapters().find(a =>
                    a.channelType === body.channelType && a.isConnected
                );

                if (!adapter) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: `No connected ${body.channelType} adapter`
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                }

                // Extract chat ID from conversationId format (e.g., "telegram:telegram-main:250516665" -> "250516665")
                let chatId = body.conversationId;
                if (body.channelType === 'telegram' && body.conversationId.includes(':')) {
                    const parts = body.conversationId.split(':');
                    chatId = parts[parts.length - 1]; // Get the last part (the actual chat ID)
                }

                console.log(`[Dashboard] Extracted chat ID: ${chatId}`);

                // Send the message
                const result = await adapter.sendMessage(chatId, {
                    type: 'text',
                    text: body.content,
                });

                console.log(`[Dashboard] Send result:`, result.success, result.error?.message);

                if (result.success) {
                    // Store outgoing message in Convex
                    if (telegramChannelId && body.channelType === 'telegram') {
                        await storeMessageInConvex(
                            telegramChannelId,
                            body.channelType,
                            result.message?.platformMessageId || '',
                            body.conversationId,
                            'You',
                            'dashboard',
                            body.content,
                            'text',
                            true
                        );
                    }
                }

                return new Response(JSON.stringify({
                    success: result.success,
                    messageId: result.message?.platformMessageId,
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            } catch (error) {
                console.error('Send error:', error);
                return new Response(JSON.stringify({
                    success: false,
                    error: String(error)
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        if (url.pathname === '/') {
            return new Response('BridgeKit API Server' + (convex ? ' (Convex connected)' : ''));
        }

        return new Response('Not Found', { status: 404 });
    },
});

console.log(`🚀 BridgeKit API server running on http://localhost:${server.port}`);

// Start all adapters
hub.start().then(() => {
    console.log('🔗 All adapters started');
}).catch((error) => {
    console.error('Failed to start adapters:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down...');
    await hub.stop();
    process.exit(0);
});
