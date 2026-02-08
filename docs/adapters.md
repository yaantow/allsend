# Adapter Reference

Detailed documentation for each Allsend adapter.

---

## Telegram Adapter

Connect to Telegram using the official Bot API.

### Installation

```bash
bun add @allsend/adapter-telegram
```

### Configuration

```typescript
import { TelegramAdapter } from '@allsend/adapter-telegram';

const telegram = new TelegramAdapter({
  id: 'telegram-main',          // Unique adapter ID
  type: 'telegram',             // Must be 'telegram'
  name: 'My Telegram Bot',      // Display name
  enabled: true,                // Enable/disable
  credentials: {
    token: 'BOT_TOKEN',         // From @BotFather
    webhookSecret: 'secret',    // Optional: for webhooks
  },
  webhookUrl: 'https://...',    // Optional: webhook URL
});

hub.registerAdapter(telegram);
```

### Getting a Bot Token

1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a name and username
4. Copy the token

### Features

| Feature | Supported |
|---------|-----------|
| Text messages | ✅ |
| Images | ✅ |
| Videos | ✅ |
| Audio/Voice | ✅ |
| Documents | ✅ |
| Stickers | ✅ |
| Location | ✅ |
| Reactions | ✅ |
| Reply to message | ✅ |
| Edit message | ✅ |
| Delete message | ✅ |
| Typing indicator | ✅ |
| Webhooks | ✅ |

### Webhook Mode

For production, webhooks are more efficient than polling:

```typescript
const telegram = new TelegramAdapter({
  // ... config
  webhookUrl: 'https://yourdomain.com/telegram/webhook',
  credentials: {
    token: 'BOT_TOKEN',
    webhookSecret: 'your-secret',
  },
});

// In your HTTP server
app.post('/telegram/webhook', telegram.getWebhookCallback());
```

---

## Discord Adapter

Connect to Discord using Discord.js.

### Installation

```bash
bun add @allsend/adapter-discord
```

### Configuration

```typescript
import { DiscordAdapter } from '@allsend/adapter-discord';

const discord = new DiscordAdapter({
  id: 'discord-main',
  type: 'discord',
  name: 'My Discord Bot',
  enabled: true,
  credentials: {
    token: 'BOT_TOKEN',
    clientId: 'CLIENT_ID',      // Optional: for slash commands
  },
  intents: ['Guilds', 'GuildMessages', 'MessageContent'],
});

hub.registerAdapter(discord);
```

### Getting a Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the token
5. Enable "Message Content Intent" under Privileged Intents

### Inviting Your Bot

Generate an invite URL with these permissions:
- Send Messages
- Read Message History
- Add Reactions
- Attach Files

URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274877975552&scope=bot
```

### Features

| Feature | Supported |
|---------|-----------|
| Text messages | ✅ |
| Images | ✅ |
| Videos | ✅ |
| Audio | ✅ |
| Files | ✅ |
| Embeds | ✅ |
| Reactions | ✅ |
| Reply to message | ✅ |
| Edit message | ✅ |
| Delete message | ✅ |
| Typing indicator | ✅ |
| Slash commands | 🔜 |

---

## WhatsApp Adapter

Connect to WhatsApp using whatsapp-web.js.

### Installation

```bash
bun add @allsend/adapter-whatsapp
```

### Configuration

```typescript
import { WhatsAppAdapter } from '@allsend/adapter-whatsapp';

const whatsapp = new WhatsAppAdapter({
  id: 'whatsapp-main',
  type: 'whatsapp',
  name: 'WhatsApp Account',
  enabled: true,
  sessionPath: './whatsapp-session',  // Where to store session
});

hub.registerAdapter(whatsapp);
```

### Initial Setup

On first run, you'll need to scan a QR code:

1. Start your server
2. Look for the QR code in the terminal
3. Open WhatsApp on your phone
4. Go to Settings → Linked Devices
5. Scan the QR code

Your session will be saved for future runs.

### Features

| Feature | Supported |
|---------|-----------|
| Text messages | ✅ |
| Images | ✅ |
| Videos | ✅ |
| Audio/Voice | ✅ |
| Documents | ✅ |
| Stickers | ✅ |
| Location | ✅ |
| Contacts | ✅ |
| Reply to message | ✅ |
| Message status | ✅ |
| Typing indicator | ✅ |

### Important Notes

- This uses the WhatsApp Web protocol, not the official Business API
- Keep your phone connected to the internet
- WhatsApp may restrict accounts that appear automated

---

## iMessage Adapter

Connect to iMessage via BlueBubbles (macOS only).

### Prerequisites

- macOS with iMessage configured
- [BlueBubbles](https://bluebubbles.app/) server running

### Configuration

```typescript
import { iMessageAdapter } from '@allsend/adapter-imessage';

const imessage = new iMessageAdapter({
  id: 'imessage-main',
  type: 'imessage',
  name: 'iMessage',
  enabled: true,
  credentials: {
    serverUrl: 'http://localhost:1234',
    password: 'your-bluebubbles-password',
  },
});

hub.registerAdapter(imessage);
```

### BlueBubbles Setup

1. Download BlueBubbles from [bluebubbles.app](https://bluebubbles.app/)
2. Run the server on your Mac
3. Set a server password
4. Note the server URL and port

### Features

| Feature | Supported |
|---------|-----------|
| Text messages | ✅ |
| Images | ✅ |
| Videos | ✅ |
| Audio | ✅ |
| Files | ✅ |
| Tapbacks | ✅ |
| Reply to message | ✅ |
| Read receipts | ✅ |
| Typing indicator | ✅ |
| Group chats | ✅ |

### Limitations

- Requires macOS with iMessage
- BlueBubbles must be running 24/7
- No official Apple API (uses BlueBubbles as intermediary)

---

## Creating Custom Adapters

You can create adapters for any platform:

```typescript
import { BaseAdapter, AdapterConfig, UnifiedMessage } from '@allsend/core';

class CustomAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config, 'custom');
  }

  async connect(): Promise<void> {
    // Connect to your platform
    this.setConnected();
  }

  async disconnect(): Promise<void> {
    // Disconnect
    this.setDisconnected('Manual disconnect');
  }

  async sendMessage(conversationId: string, content: MessageContent): Promise<SendResult> {
    // Send message to platform
    return { success: true, message: transformedMessage };
  }

  // Implement other methods...
}
```

See the existing adapters for full implementation examples.
