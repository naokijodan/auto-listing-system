import express from 'express';
import cors from 'cors';
import { productsRouter } from '../../routes/products';
import { healthRouter } from '../../routes/health';
import { listingsRouter } from '../../routes/listings';
import { jobsRouter } from '../../routes/jobs';
import { notificationsRouter } from '../../routes/notifications';
import { inventoryRouter } from '../../routes/inventory';
import { pricingRouter } from '../../routes/pricing';
import { authRouter } from '../../routes/auth';
import { marketplacesRouter } from '../../routes/marketplaces';
import shopifyRouter from '../../routes/shopify';
import { settingsRouter } from '../../routes/settings';
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
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/pricing', pricingRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/marketplaces', marketplacesRouter);
  app.use('/api/shopify-products', shopifyRouter);
  app.use('/api/settings', settingsRouter);

  // エラーハンドラー
  app.use(errorHandler);

  return app;
}
