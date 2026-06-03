# syntax=docker/dockerfile:1.7

# Multi-stage Dockerfile for the OnlineJourno Next.js web app.
# Builds from the repo root so pnpm workspaces resolve correctly.
# Final image runs the Next.js standalone server.

# ============================================================
# Stage 1: dependency installation
# ============================================================
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /repo

# Copy workspace manifests first to maximise layer cache hits.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json

# Install only the web app and its workspace deps. --frozen-lockfile
# refuses to update the lock — if it has drifted, fail loudly.
RUN pnpm install --frozen-lockfile --filter @onlinejourno/web...

# ============================================================
# Stage 2: build
# ============================================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /repo

# Bring in installed deps from stage 1.
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules

# Copy source.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web ./apps/web

# Build the Next.js app in standalone mode (set via next.config.ts).
WORKDIR /repo/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ============================================================
# Stage 3: runtime
# ============================================================
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output bundles everything the server needs into .next/standalone.
# Copy that, then the static assets and the public directory.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# Run the standalone server that Next.js emits.
CMD ["node", "apps/web/server.js"]
