# =============================================================================
# RAKUDA API & Worker Dockerfile
# =============================================================================
# マルチステージビルドで軽量なイメージを作成
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# パッケージマネージャーの設定ファイルをコピー
COPY package*.json ./
COPY turbo.json ./
COPY packages/config/package*.json ./packages/config/
COPY packages/database/package*.json ./packages/database/
COPY packages/logger/package*.json ./packages/logger/
COPY packages/schema/package*.json ./packages/schema/
COPY apps/api/package*.json ./apps/api/
COPY apps/worker/package*.json ./apps/worker/

# 依存関係をインストール
RUN npm ci --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/*/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/*/node_modules ./apps/*/node_modules 2>/dev/null || true

# ソースコードをコピー
COPY . .

# Prismaクライアントを生成
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# TypeScriptをビルド
RUN npm run build -- --filter=@rakuda/api --filter=@rakuda/worker

# -----------------------------------------------------------------------------
# Stage 3: API Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS api

WORKDIR /app

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 rakuda

# 本番用依存関係のみコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/turbo.json ./

# Prismaクライアントをコピー
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 所有者を変更
RUN chown -R rakuda:nodejs /app

USER rakuda

ENV NODE_ENV=production
ENV API_PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/api/dist/index.js"]

# -----------------------------------------------------------------------------
# Stage 4: Worker Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS worker

WORKDIR /app

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 rakuda

# 本番用依存関係のみコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker ./apps/worker
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/turbo.json ./

# Prismaクライアントをコピー
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 所有者を変更
RUN chown -R rakuda:nodejs /app

USER rakuda

ENV NODE_ENV=production

CMD ["node", "apps/worker/dist/index.js"]
