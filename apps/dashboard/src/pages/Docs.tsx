import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Book, Server, Puzzle, Layout, ChevronRight } from 'lucide-react';

// Documentation sections with their markdown paths
const docSections = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Book,
        description: 'Learn how to set up Allsend and create your first bot',
    },
    {
        id: 'self-hosting',
        title: 'Self-Hosting',
        icon: Server,
        description: 'Deploy Allsend on your own infrastructure',
    },
    {
        id: 'adapters',
        title: 'Adapters',
        icon: Puzzle,
        description: 'Detailed documentation for each platform adapter',
    },
    {
        id: 'dashboard',
        title: 'Dashboard',
        icon: Layout,
        description: 'Set up and customize the admin dashboard',
    },
];

// Store the markdown content for each section
const markdownContent: Record<string, string> = {
    'getting-started': `# Getting Started with Allsend

Learn how to set up Allsend and create your first multi-channel bot.

## Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- A bot token for at least one platform (Telegram, Discord, etc.)

## Installation

### From Source

\`\`\`bash
git clone https://github.com/yaantow/allsend.git
cd allsend
bun install
bun run build
\`\`\`

## Your First Bot

### 1. Create a Telegram Bot

1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send \`/newbot\` and follow the prompts
3. Copy your bot token

### 2. Create Your Server

\`\`\`typescript
import { createHub } from '@allsend/core';
import { TelegramAdapter } from '@allsend/adapter-telegram';

const hub = createHub();

hub.registerAdapter(new TelegramAdapter({
  id: 'my-bot',
  type: 'telegram',
  name: 'My First Bot',
  enabled: true,
  credentials: {
    token: 'YOUR_TELEGRAM_BOT_TOKEN',
  },
}));

hub.on('message', (message) => {
  if (message.content.type === 'text') {
    hub.reply(message, {
      type: 'text',
      text: \`You said: \${message.content.text}\`,
    });
  }
});

hub.start();
\`\`\`

### 3. Run Your Bot

\`\`\`bash
bun run bot.ts
\`\`\`
`,
    'self-hosting': `# Self-Hosting Allsend

Deploy Allsend on your own infrastructure.

## Docker Compose (Recommended)

\`\`\`bash
# Clone and configure
git clone https://github.com/yaantow/allsend.git
cd allsend
cp .env.example .env

# Start services
docker-compose up -d
\`\`\`

## Manual Deployment

\`\`\`bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install and build
bun install
bun run build

# Run server
bun run examples/server.ts
\`\`\`

## Environment Variables

\`\`\`bash
TELEGRAM_BOT_TOKEN=your_token
DISCORD_BOT_TOKEN=your_token
CONVEX_URL=https://your-project.convex.cloud
\`\`\`

## Cloud Deployment

Allsend can be deployed to:
- Railway
- Render
- Fly.io
- Any VPS with Bun/Node.js
`,
    'adapters': `# Adapter Reference

## Telegram Adapter

\`\`\`typescript
import { TelegramAdapter } from '@allsend/adapter-telegram';

const telegram = new TelegramAdapter({
  id: 'telegram-main',
  type: 'telegram',
  name: 'My Telegram Bot',
  enabled: true,
  credentials: {
    token: 'BOT_TOKEN',
  },
});
\`\`\`

| Feature | Supported |
|---------|-----------|
| Text | ✅ |
| Images | ✅ |
| Videos | ✅ |
| Reactions | ✅ |

## Discord Adapter

\`\`\`typescript
import { DiscordAdapter } from '@allsend/adapter-discord';

const discord = new DiscordAdapter({
  id: 'discord-main',
  type: 'discord',
  name: 'My Discord Bot',
  enabled: true,
  credentials: {
    token: 'BOT_TOKEN',
  },
});
\`\`\`

## WhatsApp Adapter

\`\`\`typescript
import { WhatsAppAdapter } from '@allsend/adapter-whatsapp';

const whatsapp = new WhatsAppAdapter({
  id: 'whatsapp-main',
  type: 'whatsapp',
  name: 'WhatsApp',
  enabled: true,
  sessionPath: './whatsapp-session',
});
\`\`\`

## iMessage Adapter

Requires BlueBubbles on macOS.

\`\`\`typescript
import { iMessageAdapter } from '@allsend/adapter-imessage';

const imessage = new iMessageAdapter({
  id: 'imessage-main',
  type: 'imessage',
  name: 'iMessage',
  enabled: true,
  credentials: {
    serverUrl: 'http://localhost:1234',
    password: 'your-password',
  },
});
\`\`\`
`,
    'dashboard': `# Dashboard Setup

## Quick Start

1. **Start Convex:**
\`\`\`bash
npx convex dev
\`\`\`

2. **Configure Environment:**
\`\`\`bash
cd apps/dashboard
echo "VITE_CONVEX_URL=https://your-project.convex.cloud" > .env
\`\`\`

3. **Start Dashboard:**
\`\`\`bash
bun run dev
\`\`\`

Open http://localhost:5173

## Features

- **Dashboard** - Overview stats and activity
- **Channels** - Manage connected adapters
- **Conversations** - View and reply to messages
- **Events** - Real-time event log

## Sending Messages

Click on a conversation to open the message thread, then type and send a reply. Messages are sent through your connected bot.
`,
};

export default function Docs() {
    const [activeSection, setActiveSection] = useState<string | null>(null);

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-title">
                    <h1>Documentation</h1>
                    <p className="page-description">
                        Learn how to use Allsend, self-host, and integrate adapters
                    </p>
                </div>
            </header>

            {!activeSection ? (
                <div className="docs-grid">
                    {docSections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <div
                                key={section.id}
                                className="doc-card"
                                onClick={() => setActiveSection(section.id)}
                            >
                                <div className="doc-card-icon">
                                    <Icon size={24} />
                                </div>
                                <div className="doc-card-content">
                                    <h3>{section.title}</h3>
                                    <p>{section.description}</p>
                                </div>
                                <ChevronRight size={20} className="doc-card-arrow" />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="doc-content">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setActiveSection(null)}
                        style={{ marginBottom: 'var(--space-lg)' }}
                    >
                        ← Back to Documentation
                    </button>
                    <div className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {markdownContent[activeSection] || '# Not Found'}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            <style>{`
                .docs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--space-lg);
                }

                .doc-card {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-lg);
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .doc-card:hover {
                    border-color: var(--color-primary);
                    transform: translateY(-2px);
                }

                .doc-card-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius-md);
                    background: var(--color-primary-muted);
                    color: var(--color-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .doc-card-content {
                    flex: 1;
                }

                .doc-card-content h3 {
                    margin: 0 0 var(--space-xs);
                    font-size: 1rem;
                }

                .doc-card-content p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: var(--color-text-muted);
                }

                .doc-card-arrow {
                    color: var(--color-text-muted);
                    flex-shrink: 0;
                }

                .doc-content {
                    max-width: 800px;
                }

                .markdown-content {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                }

                .markdown-content h1 {
                    margin-top: 0;
                    border-bottom: 1px solid var(--color-border);
                    padding-bottom: var(--space-md);
                }

                .markdown-content h2 {
                    margin-top: var(--space-xl);
                    color: var(--color-primary);
                }

                .markdown-content h3 {
                    margin-top: var(--space-lg);
                }

                .markdown-content code {
                    background: var(--color-bg);
                    padding: 2px 6px;
                    border-radius: var(--radius-sm);
                    font-size: 0.875em;
                }

                .markdown-content pre {
                    background: var(--color-bg);
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    overflow-x: auto;
                }

                .markdown-content pre code {
                    background: none;
                    padding: 0;
                }

                .markdown-content table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: var(--space-md) 0;
                }

                .markdown-content th,
                .markdown-content td {
                    border: 1px solid var(--color-border);
                    padding: var(--space-sm) var(--space-md);
                    text-align: left;
                }

                .markdown-content th {
                    background: var(--color-bg);
                }

                .markdown-content a {
                    color: var(--color-primary);
                }

                .markdown-content ul,
                .markdown-content ol {
                    padding-left: var(--space-lg);
                }

                .markdown-content li {
                    margin: var(--space-xs) 0;
                }
            `}</style>
        </div>
    );
}
