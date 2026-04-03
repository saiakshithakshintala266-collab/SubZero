# syntax=docker/dockerfile:1
# ════════════════════════════════════════════════════════════════════
# SubZero — Production Dockerfile
# Multi-stage build: deps → builder → minimal runner
# Requires: next.config.ts output: "standalone"
# ════════════════════════════════════════════════════════════════════

# ── Stage 1: system dependencies ────────────────────────────────────
FROM node:20-alpine AS base
# Install libc6-compat for native modules (bcrypt, etc.)
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── Stage 2: install production dependencies ─────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
# Use ci for reproducible installs — no semver surprises
RUN npm ci --only=production --ignore-scripts

# ── Stage 3: build ───────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (non-secret — only public values here)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 4: minimal production runner ───────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security — never run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the standalone output (no source, no dev deps)
COPY --from=builder /app/public                              ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static

USER nextjs

EXPOSE 3000

# Healthcheck compatible with docker-compose and Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
