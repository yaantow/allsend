# Allsend

> Open-source, self-hostable multi-channel communication hub for AI projects

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-orange.svg)](https://bun.sh/)

## What is allsend?

Allsend provides a **unified API** for communicating across multiple messaging platforms. Instead of building custom integrations for each platform, use Allsend's normalized message protocol and pluggable adapters.

### ✨ Features

- 🔌 **Pluggable Adapters** - Telegram, Discord, WhatsApp, iMessage
- 📊 **Real-time Dashboard** - Monitor all channels in one place
- 💾 **Convex Integration** - Real-time database with automatic sync
- 🐳 **Self-Hostable** - Run on your own infrastructure
- 🔄 **Unified Protocol** - One API for all platforms
- ⚡ **Built with Bun** - Fast, modern TypeScript runtime

### Supported Channels

| Channel | Status | Official API | Notes |
|---------|--------|--------------|-------|
| Telegram | ✅ Ready | ✅ Yes | Full Bot API support |
| Discord | ✅ Ready | ✅ Yes | Gateway + REST API |
| WhatsApp | ✅ Ready | ⚠️ Business API | Via whatsapp-web.js |
| iMessage | ✅ Ready | ❌ Via BlueBubbles | Requires macOS |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- Node.js 18+ (for some dependencies)

### Installation

```bash
# Clone the repository
git clone https://github.com/yaantow/allsend.git
cd allsend

# Install dependencies
bun install

# Build all packages
bun run build
```

### Setup Your First Bot

1. **Configure environment variables:**

```bash
cp .env.example .env
# Edit .env with your bot tokens
```

2. **Start the API server:**

```bash
bun run dev:api
```

3. **Start the dashboard (optional):**

```bash
# In a new terminal
bun run dev:dashboard
# Open http://localhost:5173
```

## Usage

### Basic Example

```typescript
import { createHub } from '@allsend/core';
import { TelegramAdapter } from '@allsend/adapter-telegram';

// Create the hub
const hub = createHub();

// Register a Telegram adapter
hub.registerAdapter(new TelegramAdapter({
  id: 'my-telegram-bot',
  type: 'telegram',
  name: 'My Bot',
  enabled: true,
  credentials: {
    token: process.env.TELEGRAM_BOT_TOKEN!,
  },
}));

// Listen for messages from any channel
hub.on('message', (message) => {
  console.log(`[${message.channelType}] ${message.sender.displayName}: ${message.content}`);
  
  // Reply back
  if (message.content.type === 'text' && message.content.text === '/hello') {
    hub.reply(message, { type: 'text', text: 'Hello from Allsend! 🚀' });
  }
});

// Start all adapters
await hub.start();
```

### Multi-Channel Setup

```typescript
import { createHub } from '@allsend/core';
import { TelegramAdapter } from '@allsend/adapter-telegram';
import { DiscordAdapter } from '@allsend/adapter-discord';

const hub = createHub();

// Register multiple adapters
hub.registerAdapter(new TelegramAdapter({
  id: 'telegram-main',
  type: 'telegram',
  name: 'Telegram Bot',
  enabled: true,
  credentials: { token: process.env.TELEGRAM_BOT_TOKEN! },
}));

hub.registerAdapter(new DiscordAdapter({
  id: 'discord-main',
  type: 'discord',
  name: 'Discord Bot',
  enabled: true,
  credentials: { token: process.env.DISCORD_BOT_TOKEN! },
}));

// Same message handler works for all channels!
hub.on('message', (message) => {
  hub.reply(message, { 
    type: 'text', 
    text: `Received on ${message.channelType}: ${message.content.text}` 
  });
});

await hub.start();
```

## Architecture

```
┌─────────────────────────────────────────────┐
│              Your Application               │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│           Allsend Unified API               │
│  ┌─────────────────────────────────────┐   │
│  │     Normalized Message Protocol      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │         │         │         │
         ▼         ▼         ▼         ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Telegram│ │Discord │ │WhatsApp│ │iMessage│
    └────────┘ └────────┘ └────────┘ └────────┘
```

## Project Structure

```
allsend/
├── packages/
│   ├── core/                 # Unified protocol & ChannelHub
│   ├── adapter-telegram/     # Telegram Bot API adapter
│   ├── adapter-discord/      # Discord.js adapter
│   ├── adapter-whatsapp/     # WhatsApp Web adapter
│   └── adapter-imessage/     # BlueBubbles integration
├── apps/
│   ├── api/                  # Production API server
│   └── dashboard/            # Real-time admin dashboard
├── convex/                   # Convex backend (schema, functions)
├── docs/                     # Documentation files
└── docker-compose.yml        # Self-hosting config
```

## Self-Hosting

### Using Docker

```bash
# Start all services
docker-compose up -d

# Access dashboard at http://localhost:5173
# API server at http://localhost:3000
```

### Manual Setup

```bash
# 1. Install dependencies
bun install

# 2. Setup Convex (optional, for dashboard)
npx convex dev

# 3. Start the server
bun run examples/server.ts

# 4. Start dashboard (in another terminal)
cd apps/dashboard && bun run dev
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Discord
DISCORD_BOT_TOKEN=your_discord_bot_token

# BlueBubbles (for iMessage)
BLUEBUBBLES_URL=http://localhost:1234
BLUEBUBBLES_PASSWORD=your_password

# Convex (auto-generated by `npx convex dev`)
CONVEX_URL=https://your-project.convex.cloud
```

## API Reference

### ChannelHub

The central hub that manages all adapters.

```typescript
const hub = createHub();

// Register adapters
hub.registerAdapter(adapter);

// Events
hub.on('message', (message) => {});
hub.on('event', (event) => {});
hub.on('adapter:connected', (adapterId, type) => {});
hub.on('adapter:disconnected', (adapterId, type, reason) => {});
hub.on('adapter:error', (adapterId, error, context) => {});

// Send messages
hub.reply(message, content);
hub.send(channelType, conversationId, content);

// Lifecycle
await hub.start();
await hub.stop();
```

### Unified Message Format

```typescript
interface UnifiedMessage {
  id: string;
  platformMessageId: string;
  channelType: 'telegram' | 'discord' | 'whatsapp' | 'imessage';
  conversationId: string;
  sender: {
    platformId: string;
    displayName: string;
    username?: string;
  };
  content: MessageContent;
  timestamp: Date;
  isOutgoing: boolean;
  replyTo?: string;
}

type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'video'; url: string; caption?: string }
  | { type: 'audio'; url: string; isVoiceNote?: boolean }
  | { type: 'file'; url: string; filename: string }
  | { type: 'location'; latitude: number; longitude: number }
  | { type: 'sticker'; url: string };
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development

```bash
# Run in development mode
bun run dev

# Build all packages
bun run build

# Run tests
bun test
```

## License

MIT © Allsend Contributors

---

<p align="center">
  <b>Built with ❤️ for the AI community</b>
</p>
