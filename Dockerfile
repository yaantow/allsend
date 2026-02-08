# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY packages/core/package.json ./packages/core/
COPY packages/adapter-telegram/package.json ./packages/adapter-telegram/
COPY packages/adapter-discord/package.json ./packages/adapter-discord/
COPY packages/adapter-whatsapp/package.json ./packages/adapter-whatsapp/
COPY packages/adapter-imessage/package.json ./packages/adapter-imessage/
COPY packages/convex/package.json ./packages/convex/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build all packages
RUN bun run build

# Runtime stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built packages
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/adapter-telegram/dist ./packages/adapter-telegram/dist
COPY --from=builder /app/packages/adapter-discord/dist ./packages/adapter-discord/dist
COPY --from=builder /app/packages/adapter-whatsapp/dist ./packages/adapter-whatsapp/dist
COPY --from=builder /app/packages/adapter-imessage/dist ./packages/adapter-imessage/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy example server
COPY examples/server.ts ./server.ts

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the server
CMD ["bun", "run", "server.ts"]
