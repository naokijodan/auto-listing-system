# =============================================================================
# RAKUDA API & Worker Dockerfile
# =============================================================================
# マルチステージビルドで軽量なイメージを作成
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 必要なツールをインストール
RUN apk add --no-cache python3 make g++

# ソースコードをコピー
COPY . .

# 依存関係をインストール
RUN npm ci --legacy-peer-deps

# Prismaクライアントを生成
RUN npx prisma generate --schema=packages/database/prisma/schema

# TypeScriptをビルド
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: API Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS api

WORKDIR /app

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 rakuda

# 本番用依存関係のみコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/turbo.json ./

# Prismaクライアントをコピー
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Entrypointスクリプトをコピー
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 所有者を変更
RUN chown -R rakuda:nodejs /app

USER rakuda

ENV NODE_ENV=production
ENV API_PORT=3000
ENV RUN_MIGRATIONS=true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh", "api"]
CMD ["node", "apps/api/dist/index.js"]

# -----------------------------------------------------------------------------
# Stage 3: Worker Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS worker

WORKDIR /app

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 rakuda

# Puppeteer用の依存関係
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Puppeteer設定
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 本番用依存関係のみコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/turbo.json ./

# Prismaクライアントをコピー
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Entrypointスクリプトをコピー
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 所有者を変更
RUN chown -R rakuda:nodejs /app

USER rakuda

ENV NODE_ENV=production

ENTRYPOINT ["docker-entrypoint.sh", "worker"]
CMD ["node", "apps/worker/dist/index.js"]
