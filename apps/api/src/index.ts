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
import ebayListingsRouter from './routes/ebay-listings';
import ebayTemplatesRouter from './routes/ebay-templates';
import ebayBulkRouter from './routes/ebay-bulk';
import ebayAutoRelistRouter from './routes/ebay-auto-relist';
import ebayInventoryRouter from './routes/ebay-inventory';
import ebaySalesRouter from './routes/ebay-sales';
import ebayMessagesRouter from './routes/ebay-messages';
import ebayOrdersRouter from './routes/ebay-orders';
import ebayReturnsRouter from './routes/ebay-returns';
import ebayFeedbackRouter from './routes/ebay-feedback';
import ebayAnalyticsRouter from './routes/ebay-analytics';
import ebayBulkEditorRouter from './routes/ebay-bulk-editor';
import ebayCompetitorsRouter from './routes/ebay-competitors';
import ebayAutoPricingRouter from './routes/ebay-auto-pricing';
import ebayScheduledRouter from './routes/ebay-scheduled';
import ebayAutoRestockRouter from './routes/ebay-auto-restock';
import ebayOptimizationRouter from './routes/ebay-optimization';
import { ebayABTestsRouter } from './routes/ebay-ab-tests';
import { ebayMultilingualRouter } from './routes/ebay-multilingual';
import { ebayPromotionsRouter } from './routes/ebay-promotions';
import { ebayReportsRouter } from './routes/ebay-reports';
import { ebayAdsRouter } from './routes/ebay-ads';
import { ebayAutoMessagesRouter } from './routes/ebay-auto-messages';
import { ebayFeedbackAnalysisRouter } from './routes/ebay-feedback-analysis';
import { ebayLogisticsRouter } from './routes/ebay-logistics';
import { ebayRecommendationsRouter } from './routes/ebay-recommendations';
import { ebayBuyerSegmentsRouter } from './routes/ebay-buyer-segments';
import { ebaySalesForecastRouter } from './routes/ebay-sales-forecast';
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
import { backupsRouter } from './routes/backups';
import { dashboardsRouter } from './routes/dashboards';
import { notificationDispatchesRouter } from './routes/notification-dispatches';
import { reportsRouter } from './routes/reports';
import { batchJobsRouter } from './routes/batch-jobs';
import { i18nRouter } from './routes/i18n';
import { cacheRouter } from './routes/cache';
import { metricsRouter } from './routes/metrics';
import { securityRouter } from './routes/security';
import { integrationsRouter } from './routes/integrations';
import enrichmentRouter from './routes/enrichment';
import joomRouter from './routes/joom';
import joomCategoriesRouter from './routes/joom-categories';
import uploadsRouter from './routes/uploads';
import { shipmentsRouter } from './routes/shipments';
import { sourcingRouter } from './routes/sourcing';
import { cacheAdminRouter } from './routes/cache-admin';
import { pricingAiRouter } from './routes/pricing-ai';
import { customerSupportRouter } from './routes/customer-support';
import { salesForecastRouter } from './routes/sales-forecast';
import { queryPerformanceRouter } from './routes/query-performance';
import { dashboardWidgetsRouter } from './routes/dashboard-widgets';
import workflowRulesRouter from './routes/workflow-rules';
import chatbotRouter from './routes/chatbot';
import advancedAnalyticsRouter from './routes/advanced-analytics';
import { abTestsRouter } from './routes/ab-tests';
import { suppliersRouter } from './routes/suppliers';
import { organizationsRouter } from './routes/organizations';
import { inventoryForecastRouter } from './routes/inventory-forecast';
import { externalIntegrationsRouter } from './routes/external-integrations';
import { securityManagementRouter } from './routes/security-management';
import { customerSuccessRouter } from './routes/customer-success';
import { customReportsRouter } from './routes/custom-reports';
import { ssoRouter } from './routes/sso';
import { systemPerformanceRouter } from './routes/system-performance';
import { multiCurrencyRouter } from './routes/multi-currency';
import { complianceRouter } from './routes/compliance';
import { advancedSearchRouter } from './routes/advanced-search';
import { dataExportImportRouter } from './routes/data-export-import';
import { webhookDeliveryRouter } from './routes/webhook-delivery';
import { apiUsageRouter } from './routes/api-usage';
import { backupRecoveryRouter } from './routes/backup-recovery';
import { monitoringAlertsRouter } from './routes/monitoring-alerts';
import { listingPerformanceRouter } from './routes/listing-performance';
import { listingImprovementRouter } from './routes/listing-improvement';
import { automationRulesRouter } from './routes/automation-rules';
import { profitCalculationRouter } from './routes/profit-calculation';
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
app.use('/api/ebay-listings', ebayListingsRouter);
app.use('/api/ebay-templates', ebayTemplatesRouter);
app.use('/api/ebay-bulk', ebayBulkRouter);
app.use('/api/ebay-auto-relist', ebayAutoRelistRouter);
app.use('/api/ebay-inventory', ebayInventoryRouter);
app.use('/api/ebay-sales', ebaySalesRouter);
app.use('/api/ebay-messages', ebayMessagesRouter);
app.use('/api/ebay-orders', ebayOrdersRouter);
app.use('/api/ebay-returns', ebayReturnsRouter);
app.use('/api/ebay-feedback', ebayFeedbackRouter);
app.use('/api/ebay-analytics', ebayAnalyticsRouter);
app.use('/api/ebay-bulk-editor', ebayBulkEditorRouter);
app.use('/api/ebay-competitors', ebayCompetitorsRouter);
app.use('/api/ebay-auto-pricing', ebayAutoPricingRouter);
app.use('/api/ebay-scheduled', ebayScheduledRouter);
app.use('/api/ebay-auto-restock', ebayAutoRestockRouter);
app.use('/api/ebay-optimization', ebayOptimizationRouter);
app.use('/api/ebay-ab-tests', ebayABTestsRouter);
app.use('/api/ebay-multilingual', ebayMultilingualRouter);
app.use('/api/ebay-promotions', ebayPromotionsRouter);
app.use('/api/ebay-reports', ebayReportsRouter);
app.use('/api/ebay-ads', ebayAdsRouter);
app.use('/api/ebay-auto-messages', ebayAutoMessagesRouter);
app.use('/api/ebay-feedback-analysis', ebayFeedbackAnalysisRouter);
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
app.use('/api/backups', backupsRouter);
app.use('/api/dashboards', dashboardsRouter);
app.use('/api/notification-dispatches', notificationDispatchesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/batch-jobs', batchJobsRouter);
app.use('/api/i18n', i18nRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/security', securityRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/enrichment', enrichmentRouter);
app.use('/api/joom', joomRouter);
app.use('/api/joom-categories', joomCategoriesRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/sourcing', sourcingRouter);
app.use('/api/admin/cache', cacheAdminRouter);
app.use('/api/pricing-ai', pricingAiRouter);
app.use('/api/customer-support', customerSupportRouter);
app.use('/api/sales-forecast', salesForecastRouter);
app.use('/api/query-performance', queryPerformanceRouter);
app.use('/api/dashboard-widgets', dashboardWidgetsRouter);
app.use('/api/workflow-rules', workflowRulesRouter);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/advanced-analytics', advancedAnalyticsRouter);
app.use('/api/ab-tests', abTestsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/inventory-forecast', inventoryForecastRouter);
app.use('/api/external-integrations', externalIntegrationsRouter);
app.use('/api/security', securityManagementRouter);
app.use('/api/customer-success', customerSuccessRouter);
app.use('/api/custom-reports', customReportsRouter);
app.use('/api/sso', ssoRouter);
app.use('/api/system-performance', systemPerformanceRouter);
app.use('/api/multi-currency', multiCurrencyRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/advanced-search', advancedSearchRouter);
app.use('/api/data-export-import', dataExportImportRouter);
app.use('/api/webhook-delivery', webhookDeliveryRouter);
app.use('/api/api-usage', apiUsageRouter);
app.use('/api/backup-recovery', backupRecoveryRouter);
app.use('/api/monitoring-alerts', monitoringAlertsRouter);
app.use('/api/listing-performance', listingPerformanceRouter);
app.use('/api/listing-improvement', listingImprovementRouter);
app.use('/api/automation-rules', automationRulesRouter);
app.use('/api/profit-calculation', profitCalculationRouter);
app.use('/api/ebay-logistics', ebayLogisticsRouter);
app.use('/api/ebay-recommendations', ebayRecommendationsRouter);
app.use('/api/ebay-buyer-segments', ebayBuyerSegmentsRouter);
app.use('/api/ebay-sales-forecast', ebaySalesForecastRouter);

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
