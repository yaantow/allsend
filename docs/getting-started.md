# Getting Started with BridgeKit

Learn how to set up BridgeKit and create your first multi-channel bot.

## Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- A bot token for at least one platform (Telegram, Discord, etc.)

## Installation

### From npm (Coming Soon)

```bash
bun add @bridgekit/core @bridgekit/adapter-telegram
```

### From Source

```bash
git clone https://github.com/your-org/bridgekit.git
cd bridgekit
bun install
bun run build
```

## Your First Bot

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy your bot token

### 2. Create Your Server

Create a file called `bot.ts`:

```typescript
import { createHub } from '@bridgekit/core';
import { TelegramAdapter } from '@bridgekit/adapter-telegram';

const hub = createHub();

// Register your Telegram bot
hub.registerAdapter(new TelegramAdapter({
  id: 'my-bot',
  type: 'telegram',
  name: 'My First Bot',
  enabled: true,
  credentials: {
    token: 'YOUR_TELEGRAM_BOT_TOKEN',
  },
}));

// Handle incoming messages
hub.on('message', (message) => {
  console.log(`${message.sender.displayName}: ${message.content.text}`);
  
  // Echo messages back
  if (message.content.type === 'text') {
    hub.reply(message, {
      type: 'text',
      text: `You said: ${message.content.text}`,
    });
  }
});

// Start the bot
hub.start().then(() => {
  console.log('Bot is running!');
});
```

### 3. Run Your Bot

```bash
bun run bot.ts
```

Now message your bot on Telegram - it should echo your messages!

## Adding More Channels

BridgeKit makes it easy to support multiple platforms:

```typescript
import { DiscordAdapter } from '@bridgekit/adapter-discord';

// Add Discord alongside Telegram
hub.registerAdapter(new DiscordAdapter({
  id: 'discord-bot',
  type: 'discord',
  name: 'Discord Bot',
  enabled: true,
  credentials: {
    token: 'YOUR_DISCORD_BOT_TOKEN',
  },
}));
```

Your message handler will now receive messages from both platforms!

## Understanding Messages

Every message in BridgeKit follows a unified format:

```typescript
interface Message {
  id: string;                    // Unique BridgeKit ID
  platformMessageId: string;     // Original platform ID
  channelType: string;           // 'telegram', 'discord', etc.
  conversationId: string;        // Chat/Channel ID
  sender: {
    platformId: string;          // User's platform ID
    displayName: string;         // User's display name
    username?: string;           // Username (if available)
  };
  content: {
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
    // Additional fields based on type
  };
  timestamp: Date;
  isOutgoing: boolean;          // Was this sent by the bot?
}
```

## Sending Different Content Types

### Text Messages

```typescript
hub.reply(message, {
  type: 'text',
  text: 'Hello, world!',
});
```

### Images

```typescript
hub.reply(message, {
  type: 'image',
  url: 'https://example.com/image.jpg',
  caption: 'Check this out!',
});
```

### Files

```typescript
hub.reply(message, {
  type: 'file',
  url: 'https://example.com/document.pdf',
  filename: 'document.pdf',
});
```

### Location

```typescript
hub.reply(message, {
  type: 'location',
  latitude: 40.7128,
  longitude: -74.0060,
  title: 'New York City',
});
```

## Next Steps

- [Self-Hosting Guide](./self-hosting.md) - Deploy BridgeKit on your own server
- [Adapter Reference](./adapters.md) - Detailed docs for each platform
- [Dashboard Setup](./dashboard.md) - Set up the admin dashboard
