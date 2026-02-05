import express from 'express';
import cors from 'cors';
import { productsRouter } from '../../routes/products';
import { healthRouter } from '../../routes/health';
import { listingsRouter } from '../../routes/listings';
import { jobsRouter } from '../../routes/jobs';
import { errorHandler } from '../../middleware/error-handler';

/**
 * テスト用アプリケーションを作成
 * 認証をスキップし、必要最小限のミドルウェアのみ設定
 */
export function createTestApp() {
  const app = express();

  // 基本ミドルウェア
  app.use(cors());
  app.use(express.json());

  // ルート
  app.use('/api/health', healthRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/listings', listingsRouter);
  app.use('/api/jobs', jobsRouter);

  // エラーハンドラー
  app.use(errorHandler);

  return app;
}
