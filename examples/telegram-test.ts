/**
 * Simple Telegram Bot Test
 * 
 * Run with: bun run examples/telegram-test.ts
 */

import { Bot } from 'grammy';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in environment');
    console.log('Add it to your .env file:');
    console.log('  TELEGRAM_BOT_TOKEN=your_token_here');
    process.exit(1);
}

console.log('🤖 Starting Telegram bot...');

const bot = new Bot(token);

// Handle /start command
bot.command('start', (ctx) => {
    ctx.reply('👋 Hello! I am your BridgeKit bot.\n\nTry these commands:\n• /help\n• /ping\n• /echo <text>');
});

// Handle /help command
bot.command('help', (ctx) => {
    ctx.reply(`🤖 BridgeKit Bot

Available commands:
• /start - Start the bot
• /help - Show this help message  
• /ping - Check if the bot is alive
• /echo <text> - Echo your message back

Powered by BridgeKit 🚀`);
});

// Handle /ping command
bot.command('ping', (ctx) => {
    ctx.reply('🏓 Pong!');
});

// Handle /echo command
bot.command('echo', (ctx) => {
    const text = ctx.match || 'You need to provide text after /echo';
    ctx.reply(`📢 Echo: ${text}`);
});

// Handle regular messages
bot.on('message:text', (ctx) => {
    console.log(`📩 ${ctx.from?.first_name}: ${ctx.message.text}`);
});

// Error handling
bot.catch((err) => {
    console.error('Bot error:', err);
});

// Start the bot
bot.start({
    onStart: () => {
        console.log('✅ Bot is running! Send it a message on Telegram.');
        console.log('Press Ctrl+C to stop.');
    },
});
