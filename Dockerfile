# syntax=docker/dockerfile:1
# Build context = repo root (pnpm workspace). Builds @onlinejourno/web,
# ships Next.js standalone output (nested at apps/web/server.js).

# Tailwind v4 (lightningcss) + Next SWC ship native binaries —
# glibc (bookworm-slim) avoids the musl/alpine native-binary pain.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- deps: install full workspace from frozen lockfile ----
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter @onlinejourno/web...

# ---- build: compile Next standalone output ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @onlinejourno/web build

# ---- runner: minimal standalone server ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN useradd --system --uid 1001 nextjs
USER nextjs

# standalone bundle: node_modules at root, app entry at apps/web/server.js
COPY --from=build --chown=nextjs:nextjs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nextjs /app/apps/web/public ./apps/web/public

# DB migrate-on-deploy: migrations + runner for the fly.toml [deploy] release_command.
# pg is already in the standalone node_modules (the app uses it).
COPY --chown=nextjs:nextjs apps/web/scripts ./apps/web/scripts
COPY --chown=nextjs:nextjs infra/migrations ./infra/migrations

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
