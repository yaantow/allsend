# Self-Hosting allsend

This guide covers deploying allsend on your own infrastructure.

## Deployment Options

1. **Docker Compose** (Recommended) - Easiest setup
2. **Manual Deployment** - Full control over the setup
3. **Cloud Platforms** - Deploy to Railway, Render, etc.

---

## Docker Compose (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- Your bot tokens configured

### Quick Start

1. **Clone the repository:**

```bash
git clone https://github.com/your-org/allsend.git
cd allsend
```

2. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your tokens
```

3. **Start services:**

```bash
docker-compose up -d
```

4. **Access your services:**

- Dashboard: http://localhost:5173
- API Server: http://localhost:3000/health

### Docker Compose Configuration

The default `docker-compose.yml` includes:

```yaml
version: '3.8'

services:
  server:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped

  dashboard:
    build:
      context: ./apps/dashboard
    ports:
      - "5173:5173"
    environment:
      - VITE_CONVEX_URL=${CONVEX_URL}
    depends_on:
      - server
    restart: unless-stopped
```

---

## Manual Deployment

### System Requirements

- Bun v1.0+ or Node.js 18+
- 512MB RAM minimum
- Linux, macOS, or Windows (WSL recommended)

### Step 1: Install Dependencies

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone https://github.com/your-org/allsend.git
cd allsend
bun install
bun run build
```

### Step 2: Configure Environment

Create `/etc/allsend/.env` or use your preferred location:

```bash
# Bot Tokens
TELEGRAM_BOT_TOKEN=your_token
DISCORD_BOT_TOKEN=your_token

# Convex (optional)
CONVEX_URL=https://your-project.convex.cloud
```

### Step 3: Create Systemd Service

Create `/etc/systemd/system/allsend.service`:

```ini
[Unit]
Description=allsend Server
After=network.target

[Service]
Type=simple
User=allsend
WorkingDirectory=/opt/allsend
ExecStart=/usr/local/bin/bun run examples/server.ts
EnvironmentFile=/etc/allsend/.env
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Step 4: Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable allsend
sudo systemctl start allsend
```

### Step 5: Check Status

```bash
sudo systemctl status allsend
curl http://localhost:3000/health
```

---

## Cloud Deployment

### Railway

1. Fork the repository to your GitHub
2. Connect Railway to your GitHub
3. Add environment variables in Railway dashboard
4. Deploy!

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `bun install && bun run build`
4. Set start command: `bun run examples/server.ts`
5. Add environment variables

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly secrets set TELEGRAM_BOT_TOKEN=your_token
fly deploy
```

---

## Convex Setup (For Dashboard)

The dashboard requires Convex for real-time data sync.

### Step 1: Create Convex Project

```bash
npx convex dev
# Follow prompts to create a project
```

### Step 2: Get Your URL

After setup, you'll have a URL like:
`https://your-project.convex.cloud`

### Step 3: Configure Dashboard

Add to your `.env`:

```bash
CONVEX_URL=https://your-project.convex.cloud
```

For the dashboard:

```bash
cd apps/dashboard
echo "VITE_CONVEX_URL=https://your-project.convex.cloud" > .env
```

---

## Reverse Proxy (Nginx)

For production, use a reverse proxy:

```nginx
server {
    listen 80;
    server_name allsend.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## SSL/HTTPS

Use Let's Encrypt for free SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d allsend.yourdomain.com
```

---

## Monitoring

### Health Checks

The server exposes a health endpoint:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "convex": true,
  "adapters": [
    { "id": "telegram-main", "type": "telegram", "connected": true }
  ]
}
```

### Logs

```bash
# Docker logs
docker-compose logs -f server

# Systemd logs
sudo journalctl -u allsend -f
```

---

## Troubleshooting

### Bot not responding?

1. Check the health endpoint
2. Verify your token is correct
3. Check logs for errors

### Dashboard not loading?

1. Verify `VITE_CONVEX_URL` is set
2. Check browser console for errors
3. Ensure Convex is running: `npx convex dev`

### Connection issues?

1. Check firewall rules (ports 3000, 5173)
2. Verify DNS configuration
3. Check SSL certificate validity
