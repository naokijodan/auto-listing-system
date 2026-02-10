import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { swaggerSpec } from './config/swagger';
import { prisma } from '@rakuda/database';

import { productsRouter } from './routes/products';
import { listingsRouter } from './routes/listings';
import { jobsRouter } from './routes/jobs';
import { healthRouter } from './routes/health';
import { adminRouter } from './routes/admin';
import { notificationsRouter } from './routes/notifications';
import { categoriesRouter } from './routes/categories';
import { templatesRouter } from './routes/templates';
import { promptsRouter } from './routes/prompts';
import { analyticsRouter } from './routes/analytics';
import { inventoryRouter } from './routes/inventory';
import { pricingRouter } from './routes/pricing';
import { competitorsRouter } from './routes/competitors';
import { rateLimitsRouter } from './routes/rate-limits';
import { monitoringRouter } from './routes/monitoring';
import { concurrencyRouter } from './routes/concurrency';
import { authRouter } from './routes/auth';
import { marketplacesRouter } from './routes/marketplaces';
import { webhooksRouter } from './routes/webhooks';
import { ordersRouter } from './routes/orders';
import { notificationChannelsRouter } from './routes/notification-channels';
import { alertsRouter } from './routes/alerts';
import { realtimeRouter } from './routes/realtime';
import { pricingOptimizerRouter } from './routes/pricing-optimizer';
import { competitorMonitoringRouter } from './routes/competitor-monitoring';
import { dashboardAnalyticsRouter } from './routes/dashboard-analytics';
import { batchOperationsRouter } from './routes/batch-operations';
import { scheduledReportsRouter } from './routes/scheduled-reports';
import { settingsRouter } from './routes/settings';
import ebayAuthRouter from './routes/ebay-auth';
import { bulkOperationsRouter } from './routes/bulk-operations';
import { refundsRouter } from './routes/refunds';
import { shippingRouter } from './routes/shipping';
import { performanceRouter } from './routes/performance';
import { messageTemplatesRouter } from './routes/message-templates';
import { customerMessagesRouter } from './routes/customer-messages';
import { inventoryAlertsRouter } from './routes/inventory-alerts';
import { salesAnalyticsRouter } from './routes/sales-analytics';
import { exportsRouter } from './routes/exports';
import { auditLogsRouter } from './routes/audit-logs';
import { systemSettingsRouter } from './routes/system-settings';
import { apiKeysRouter } from './routes/api-keys';
import { usersRouter } from './routes/users';
import { rolesRouter } from './routes/roles';
import { webhookEndpointsRouter } from './routes/webhook-endpoints';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { apiKeyAuth } from './middleware/auth';

const app = express();
const PORT = process.env.API_PORT || 3000;
const BULL_BOARD_PORT = process.env.BULL_BOARD_PORT || 3001;

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// BullMQキュー
const queues = Object.values(QUEUE_NAMES).map(
  (name) => new Queue(name, { connection: redis })
);

// Bull Board セットアップ
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: queues.map((q) => new BullMQAdapter(q) as any),
  serverAdapter,
});

// ミドルウェア
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Swagger API ドキュメント（認証不要）
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'RAKUDA API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
  },
}));

// OpenAPI spec JSON endpoint
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// API認証（ヘルスチェック以外）
app.use(apiKeyAuth);

// ルート
app.use('/api/health', healthRouter);
app.use('/api/products', productsRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/rate-limits', rateLimitsRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/concurrency', concurrencyRouter);
app.use('/api/auth', authRouter);
app.use('/api/marketplaces', marketplacesRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/notification-channels', notificationChannelsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/realtime', realtimeRouter);
app.use('/api/pricing-optimizer', pricingOptimizerRouter);
app.use('/api/competitor-monitoring', competitorMonitoringRouter);
app.use('/api/dashboard', dashboardAnalyticsRouter);
app.use('/api/batch', batchOperationsRouter);
app.use('/api/scheduled-reports', scheduledReportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ebay', ebayAuthRouter);
app.use('/api/bulk', bulkOperationsRouter);
app.use('/api/refunds', refundsRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/message-templates', messageTemplatesRouter);
app.use('/api/customer-messages', customerMessagesRouter);
app.use('/api/inventory-alerts', inventoryAlertsRouter);
app.use('/api/sales-analytics', salesAnalyticsRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/system-settings', systemSettingsRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/webhook-endpoints', webhookEndpointsRouter);

// Bull Board（管理UI）
app.use('/admin/queues', serverAdapter.getRouter());

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
async function start() {
  try {
    // DB接続確認
    await prisma.$connect();
    logger.info('Database connected');

    // Redis接続確認
    await redis.ping();
    logger.info('Redis connected');

    // APIサーバー起動
    app.listen(PORT, () => {
      logger.info(`API server running on http://localhost:${PORT}`);
      logger.info(`API docs available at http://localhost:${PORT}/api/docs`);
      logger.info(`Bull Board running on http://localhost:${PORT}/admin/queues`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();
