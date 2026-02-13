# RAKUDA 開発者ガイド

## 概要

RAKUDAは、日本のECサイト（ヤフオク、メルカリ、Amazon JP）から商品をスクレイピングし、海外マーケットプレイス（eBay、Joom）に自動出品する越境EC自動化システムです。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Queue | BullMQ (Redis) |
| Storage | MinIO/S3 |
| AI | OpenAI GPT-4o |
| Testing | Vitest, Playwright |

---

## プロジェクト構造

```
rakuda/
├── apps/
│   ├── api/           # Express.js APIサーバー (port 3000)
│   │   ├── src/
│   │   │   ├── routes/     # APIルート
│   │   │   ├── middleware/ # ミドルウェア
│   │   │   ├── test/       # テスト
│   │   │   └── index.ts    # エントリーポイント
│   │   └── vitest.config.ts
│   ├── web/           # Next.js フロントエンド (port 3002)
│   │   ├── src/
│   │   │   ├── app/        # App Router ページ
│   │   │   ├── components/ # UIコンポーネント
│   │   │   └── lib/        # ユーティリティ
│   │   ├── e2e/            # E2Eテスト
│   │   └── playwright.config.ts
│   └── worker/        # BullMQ ワーカープロセス
├── packages/
│   ├── database/      # Prisma スキーマ・クライアント
│   ├── schema/        # Zod バリデーションスキーマ
│   ├── config/        # 共通設定
│   └── logger/        # ロギングユーティリティ
├── extensions/
│   └── chrome/        # Chrome拡張機能
└── docs/              # ドキュメント
```

---

## セットアップ

### 前提条件

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm 8+ (推奨)

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/naokijodan/auto-listing-system.git
cd auto-listing-system

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env
# .envを編集して必要な値を設定
```

### 環境変数

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rakuda

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-...

# eBay
EBAY_APP_ID=...
EBAY_CERT_ID=...
EBAY_DEV_ID=...

# Joom
JOOM_CLIENT_ID=...
JOOM_CLIENT_SECRET=...

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=rakuda

# Encryption
ENCRYPTION_KEY=your-32-char-key-here
BACKUP_ENCRYPTION_KEY=your-backup-key-here
```

### データベースセットアップ

```bash
# Prismaクライアント生成
npx prisma generate --schema=packages/database/prisma/schema.prisma

# マイグレーション実行
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

---

## 開発コマンド

### 開発サーバー起動

```bash
# 全サービス起動
pnpm dev

# 個別起動
pnpm --filter api dev     # APIサーバー (port 3000)
pnpm --filter web dev     # Webフロントエンド (port 3002)
pnpm --filter worker dev  # BullMQワーカー
```

### ビルド

```bash
# 全パッケージビルド
pnpm build

# 個別ビルド
pnpm --filter api build
pnpm --filter web build
```

### テスト

```bash
# ユニットテスト
pnpm test:unit

# 統合テスト
pnpm test:integration

# E2Eテスト
pnpm test:e2e

# カバレッジ
pnpm test:coverage
```

---

## 開発パターン

### APIルート作成

1. `apps/api/src/routes/` にファイル作成
2. Express Routerでエンドポイント定義
3. `apps/api/src/index.ts` にimport・use追加

```typescript
// apps/api/src/routes/example.ts
import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

export const exampleRouter = Router();

exampleRouter.get('/', async (req, res) => {
  try {
    const data = await prisma.example.findMany();
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching examples', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});
```

### フロントエンドページ作成

1. `apps/web/src/app/` にディレクトリ作成
2. `page.tsx` でページ実装
3. shadcn/ui コンポーネント使用

```tsx
// apps/web/src/app/example/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExamplePage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/example')
      .then(res => res.json())
      .then(json => setData(json.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Example</h1>
      <Card>
        <CardHeader>
          <CardTitle>データ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {/* コンテンツ */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Prismaスキーマ追加

1. `packages/database/prisma/schema.prisma` にモデル追加
2. マイグレーション実行

```prisma
model Example {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```bash
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma --name add_example
```

### ナビゲーション更新

1. `apps/web/src/components/layout/sidebar.tsx` にリンク追加
2. `apps/web/src/components/layout/mobile-nav.tsx` にリンク追加

---

## テスト

### ユニットテスト (Vitest)

```typescript
// apps/api/src/test/unit/example.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@rakuda/database', () => ({
  prisma: {
    example: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { exampleRouter } from '../../routes/example';

describe('Example API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/api/example', exampleRouter);
  });

  it('should return empty array', async () => {
    const response = await request(app).get('/api/example');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### E2Eテスト (Playwright)

```typescript
// apps/web/e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Example Page', () => {
  test('should display page title', async ({ page }) => {
    await page.goto('/example');
    await expect(page.locator('h1')).toContainText('Example');
  });
});
```

---

## コード規約

### ファイル命名

- TypeScript: `kebab-case.ts`
- React: `PascalCase.tsx` または `page.tsx` (App Router)
- テスト: `*.test.ts`, `*.spec.ts`

### コミットメッセージ

```
<type>: <description>

<optional body>
```

タイプ:
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `test`: テスト追加
- `docs`: ドキュメント
- `chore`: その他

### Immutability

オブジェクトは常に新規作成（ミューテーション禁止）:

```typescript
// ❌ Bad
function updateUser(user, name) {
  user.name = name;
  return user;
}

// ✅ Good
function updateUser(user, name) {
  return { ...user, name };
}
```

---

## トラブルシューティング

### Prismaエラー

```bash
# クライアント再生成
npx prisma generate --schema=packages/database/prisma/schema.prisma

# マイグレーションリセット（開発環境のみ）
npx prisma migrate reset --schema=packages/database/prisma/schema.prisma
```

### Redisエラー

```bash
# Redis起動確認
redis-cli ping

# キャッシュクリア
redis-cli FLUSHALL
```

### ビルドエラー

```bash
# node_modulesクリア
rm -rf node_modules
pnpm install

# TypeScriptキャッシュクリア
rm -rf .next
rm -rf dist
```

---

## 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [BullMQ Documentation](https://docs.bullmq.io)

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-02-13 | 初版作成 |
