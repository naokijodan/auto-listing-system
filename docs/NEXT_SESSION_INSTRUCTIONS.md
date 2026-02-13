# RAKUDA 次セッション指示書

## 更新日
2026-02-13

## 現在の状態

### 完了済みPhase（直近）

| Phase | 内容 | 状態 |
|-------|------|------|
| 97-98 | 自動アクションルール & 利益計算・原価管理 | ✅ 完了 |
| 95-96 | eBay出品パフォーマンス分析 & 改善提案エンジン | ✅ 完了 |
| 93-94 | バックアップ・リカバリ強化 & 監視アラート強化 | ✅ 完了 |
| 91-92 | Webhook配信システム強化 & API利用統計＆レート制限強化 | ✅ 完了 |
| 89-90 | 高度な検索・フィルタリング & データエクスポート・インポート強化 | ✅ 完了 |
| 87-88 | 多通貨対応強化 & 監査・コンプライアンス | ✅ 完了 |
| 85-86 | SSO/SAML対応 & パフォーマンス最適化 | ✅ 完了 |
| 83-84 | カスタマーサクセス機能 & 高度なレポーティング | ✅ 完了 |
| 81-82 | 外部連携強化 & セキュリティ強化 | ✅ 完了 |

### 最新コミット

```
(コミット予定) feat: Phase 97-98 自動アクションルールと利益計算機能を実装
```

---

## 次に実装すべきPhase

### Phase 99-100: テスト強化 & ドキュメント整備

**Phase 99: テスト強化**
1. 単体テスト追加
   - APIルート全体のユニットテスト
   - サービスクラスのテスト
   - ユーティリティ関数のテスト

2. 統合テスト追加
   - データベース操作のテスト
   - BullMQジョブのテスト
   - 外部API連携のモックテスト

3. E2Eテスト追加（Playwright）
   - 主要ユーザーフローのテスト
   - ダッシュボード・商品管理・注文管理
   - 認証・権限テスト

**Phase 100: ドキュメント整備**
1. API仕様書
   - OpenAPI/Swagger更新
   - エンドポイント一覧
   - リクエスト/レスポンス例

2. 開発者ガイド
   - セットアップ手順
   - 開発フロー
   - デプロイ手順

3. ユーザーマニュアル
   - 機能説明
   - 操作手順
   - FAQ

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Express.js (Hono), TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Queue | BullMQ (Redis) |
| Storage | MinIO/S3 |
| AI | OpenAI GPT-4o |

---

## 実装パターン

### APIルート作成手順
1. `apps/api/src/routes/xxx.ts` でHono APIを実装
2. `apps/api/src/index.ts` にimport・use追加
3. RESTful CRUD + 統計エンドポイント

### フロントエンドページ作成手順
1. `apps/web/src/app/xxx/page.tsx` でページ実装
2. shadcn/ui コンポーネント使用
3. タブ構成（一覧・詳細・設定）
4. ダイアログで作成・編集

### Prismaスキーマ追加手順
1. `packages/database/prisma/schema.prisma` にモデル追加
2. enum定義（必要に応じて）
3. リレーション設定

### ナビゲーション更新
1. `apps/web/src/components/layout/sidebar.tsx` にリンク追加
2. `apps/web/src/components/layout/mobile-nav.tsx` にリンク追加
3. lucide-reactアイコン使用

---

## 完了条件

各Phaseで以下を必ず実施：
1. Prismaスキーマ追加
2. APIルート実装
3. フロントエンドページ実装
4. サイドバー・モバイルナビ更新
5. HANDOVER.md更新
6. Git commit & push
7. Obsidianノート作成（`/Users/naokijodan/開発ログ/rakuda_phaseXX_YYYYMMDD.md`）

---

## 参照ファイル

- `HANDOVER.md` - 引き継ぎ書（最新状態）
- `CLAUDE.md` - プロジェクトルール
- `packages/database/prisma/schema.prisma` - DBスキーマ
- `apps/api/src/index.ts` - APIルート登録
- `apps/web/src/components/layout/sidebar.tsx` - サイドバー
