FROM node:20-bookworm-slim AS base

WORKDIR /app

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    PUPPETEER_SKIP_DOWNLOAD=true

RUN corepack enable \
    && corepack prepare pnpm@10.15.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./


# =========================
# Dependencies
# =========================
FROM base AS dependencies

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

RUN pnpm install --frozen-lockfile


# =========================
# Build
# =========================
FROM dependencies AS build

COPY tsconfig.json ./
COPY src ./src

RUN pnpm run build


# =========================
# Production dependencies
# =========================
FROM dependencies AS production-dependencies

ENV NODE_ENV=production

RUN pnpm prune --prod \
    && pnpm rebuild bcrypt \
    && node -e "require('bcrypt'); console.log('bcrypt native binding verified')"


# =========================
# Production
# =========================
FROM node:20-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node public ./public
COPY --chown=node:node firebase.json ./firebase.json

USER node

EXPOSE 8000 8005

CMD ["node", "dist/server.js"]
