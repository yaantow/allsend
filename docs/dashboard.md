# Dashboard Setup

The BridgeKit dashboard provides a real-time view of all your connected channels.

## Features

- 📊 **Overview Dashboard** - Stats and activity at a glance
- 🔌 **Channel Management** - View and manage connected adapters
- 💬 **Conversations** - View all messages across channels
- 📝 **Reply from Dashboard** - Send messages through your bots
- 📈 **Event Log** - Real-time event stream

## Quick Start

### 1. Start Convex (Required for real-time data)

```bash
npx convex dev
```

This will:
- Create a Convex project (first time only)
- Generate `CONVEX_URL` in `.env.local`
- Start watching for schema changes

### 2. Configure Dashboard Environment

The dashboard needs the Convex URL:

```bash
cd apps/dashboard
echo "VITE_CONVEX_URL=https://your-project.convex.cloud" > .env
```

Or copy from the generated `.env.local`:

```bash
# From project root
cp .env.local apps/dashboard/.env
# Rename CONVEX_URL to VITE_CONVEX_URL
```

### 3. Start the Dashboard

```bash
cd apps/dashboard
bun run dev
```

Open http://localhost:5173

### 4. Connect Your Server

Make sure your bot server is running and has `CONVEX_URL` set:

```bash
bun run examples/server.ts
```

The server will:
- Sync channel status to Convex
- Store incoming messages
- Log events

## Pages

### Dashboard

The main overview page showing:
- Total message count
- Active channels
- Messages today
- Recent activity

### Channels

View all registered adapters:
- Connection status (connected/disconnected/error)
- Last connected timestamp
- Error messages (if any)

### Conversations

List of all conversations grouped by chat:
- Click a conversation to view the message thread
- Send replies directly from the dashboard

### Events

Real-time event log:
- message.received
- message.sent
- adapter.connected
- adapter.disconnected
- And more...

## Sending Messages from Dashboard

The dashboard can send messages through your bot server:

1. Click on a conversation
2. Type your message in the input
3. Click Send

The message is sent to:
```
POST http://localhost:3000/api/send
{
  "conversationId": "...",
  "channelType": "telegram",
  "content": "Hello!"
}
```

Make sure your server is running!

## Customizing the Dashboard

### Adding New Pages

1. Create a new page in `apps/dashboard/src/pages/`
2. Add the route in `App.tsx`
3. Add navigation link in the sidebar

### Styling

The dashboard uses CSS custom properties. Edit `index.css`:

```css
:root {
  --color-primary: #8b5cf6;
  --color-surface: #1f2937;
  /* ... */
}
```

## Production Deployment

### Build for Production

```bash
cd apps/dashboard
bun run build
```

Output will be in `dist/`.

### Deploy to Static Hosting

The dashboard is a static site. Deploy to:
- Vercel
- Netlify
- Cloudflare Pages
- Any static host

### Environment Variables

Set these in your hosting platform:
- `VITE_CONVEX_URL` - Your Convex deployment URL

## Troubleshooting

### Dashboard shows demo data

1. Check that `VITE_CONVEX_URL` is set in `.env`
2. Ensure Convex is running: `npx convex dev`
3. Restart the dashboard

### Messages not appearing

1. Check that the server has `CONVEX_URL` set
2. Look for errors in server logs
3. Check Convex dashboard for data

### Reply not sending

1. Verify server is running at `http://localhost:3000`
2. Check browser console for CORS errors
3. Check server logs for send errors
