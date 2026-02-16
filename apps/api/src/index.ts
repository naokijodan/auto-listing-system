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
import { ebayInventoryOptimizationRouter } from './routes/ebay-inventory-optimization';
import { ebayCustomerLifecycleRouter } from './routes/ebay-customer-lifecycle';
import { ebayDashboardRouter } from './routes/ebay-dashboard';
import { ebayMultiStoreRouter } from './routes/ebay-multi-store';
import { ebayApiMonitorRouter } from './routes/ebay-api-monitor';
import { ebayProfitCalculatorRouter } from './routes/ebay-profit-calculator';
import { ebayWorkflowsRouter } from './routes/ebay-workflows';
import { ebayVariationsRouter } from './routes/ebay-variations';
import { ebayBundlesRouter } from './routes/ebay-bundles';
import { ebayShippingInternationalRouter } from './routes/ebay-shipping-international';
import { ebaySellerHubRouter } from './routes/ebay-seller-hub';
import { ebayCategoryMappingRouter } from './routes/ebay-category-mapping';
import { ebayProductResearchRouter } from './routes/ebay-product-research';
import { ebayCustomerCommunicationRouter } from './routes/ebay-customer-communication';
import { ebayInventoryAlertsRouter } from './routes/ebay-inventory-alerts';
import { ebayReviewManagementRouter } from './routes/ebay-review-management';
import { ebayShipmentTrackingRouter } from './routes/ebay-shipment-tracking';
import { ebayAlertHubRouter } from './routes/ebay-alert-hub';
import { ebayTemplatesV2Router } from './routes/ebay-templates-v2';
import { ebaySeoOptimizerRouter } from './routes/ebay-seo-optimizer';
import { ebayListingQualityRouter } from './routes/ebay-listing-quality';
import { ebayTaxDutyRouter } from './routes/ebay-tax-duty';
import { ebayBulkExportImportRouter } from './routes/ebay-bulk-export-import';
import { ebayNotificationCenterRouter } from './routes/ebay-notification-center';
import { ebayActivityLogRouter } from './routes/ebay-activity-log';
import { ebayDataBackupRouter } from './routes/ebay-data-backup';
import { ebayPerformanceMonitorRouter } from './routes/ebay-performance-monitor';
import { ebayUserPreferencesRouter } from './routes/ebay-user-preferences';
import { ebayHelpCenterRouter } from './routes/ebay-help-center';
import { ebayWebhookManagerRouter } from './routes/ebay-webhook-manager';
import { ebayApiKeysRouter } from './routes/ebay-api-keys';
import { ebayAuditComplianceRouter } from './routes/ebay-audit-compliance';
import { ebayMultiUserRouter } from './routes/ebay-multi-user';
import { ebayAdvancedReportingRouter } from './routes/ebay-advanced-reporting';
import { ebayDataVisualizationRouter } from './routes/ebay-data-visualization';
import { ebayMlInsightsRouter } from './routes/ebay-ml-insights';
import { ebayIntegrationHubRouter } from './routes/ebay-integration-hub';
import { ebayMobileApiRouter } from './routes/ebay-mobile-api';
import { ebayRealtimeCollabRouter } from './routes/ebay-realtime-collab';
import { ebayCustomWorkflowsRouter } from './routes/ebay-custom-workflows';
import { ebayAiAssistantRouter } from './routes/ebay-ai-assistant';
import { ebayBulkImportExportRouter } from './routes/ebay-bulk-import-export';
import { ebayNotificationCenterV2Router } from './routes/ebay-notification-center-v2';
import { ebayCustomerSupportHubRouter } from './routes/ebay-customer-support-hub';
import { ebayAdvancedSearchV2Router } from './routes/ebay-advanced-search-v2';
import { ebaySecurityCenterRouter } from './routes/ebay-security-center';
import { ebayDeveloperPortalRouter } from './routes/ebay-developer-portal';
import { ebayAnalyticsDashboardV2Router } from './routes/ebay-analytics-dashboard-v2';
import { ebayMultiLanguageV2Router } from './routes/ebay-multi-language-v2';
import { ebayMarketplaceSyncRouter } from './routes/ebay-marketplace-sync';
import { ebayInventoryHubRouter } from './routes/ebay-inventory-hub';
import { ebayOrderFulfillmentRouter } from './routes/ebay-order-fulfillment';
import { ebayPricingIntelligenceRouter } from './routes/ebay-pricing-intelligence';
import { ebaySellerPerformanceRouter } from './routes/ebay-seller-performance';
import { ebayProductCatalogRouter } from './routes/ebay-product-catalog';
import { ebayShippingCalculatorRouter } from './routes/ebay-shipping-calculator';
import { ebayTaxManagementRouter } from './routes/ebay-tax-management';
import { ebaySupplierManagementRouter } from './routes/ebay-supplier-management';
import { ebayReturnCenterRouter } from './routes/ebay-return-center';
import { ebayMarketingHubRouter } from './routes/ebay-marketing-hub';
import { ebayInventoryForecastingRouter } from './routes/ebay-inventory-forecasting';
import { ebayCustomerAnalyticsRouter } from './routes/ebay-customer-analytics';
import { ebayOrderAutomationRouter } from './routes/ebay-order-automation';
import { ebayCompetitiveIntelligenceRouter } from './routes/ebay-competitive-intelligence';
import ebayRevenueOptimizationRouter from './routes/ebay-revenue-optimization';
import ebayFinancialReportingRouter from './routes/ebay-financial-reporting';
import ebayBusinessAnalyticsRouter from './routes/ebay-business-analytics';
import ebayCrossBorderHubRouter from './routes/ebay-cross-border-hub';
import ebayQualityControlRouter from './routes/ebay-quality-control';
import ebayStoreManagementRouter from './routes/ebay-store-management';
import ebayWorkflowAutomationRouter from './routes/ebay-workflow-automation';
import ebayInsightsDashboardRouter from './routes/ebay-insights-dashboard';
import ebayAccountSettingsRouter from './routes/ebay-account-settings';
import ebayComplianceCenterRouter from './routes/ebay-compliance-center';
import ebayPerformanceAnalyticsRouter from './routes/ebay-performance-analytics';
import ebayMarketIntelligenceRouter from './routes/ebay-market-intelligence';
import ebayAutomationHubRouter from './routes/ebay-automation-hub';
import ebayDataCenterRouter from './routes/ebay-data-center';
import ebayIntegrationMarketplaceRouter from './routes/ebay-integration-marketplace';
import ebaySmartSchedulerRouter from './routes/ebay-smart-scheduler';
import ebayCustomerInsightsRouter from './routes/ebay-customer-insights';
import ebayListingOptimizerRouter from './routes/ebay-listing-optimizer';
import ebayOrderHubRouter from './routes/ebay-order-hub';
import ebayShippingCenterRouter from './routes/ebay-shipping-center';
import ebayPaymentGatewayRouter from './routes/ebay-payment-gateway';
import ebayAnalyticsHubRouter from './routes/ebay-analytics-hub';
import ebayReputationCenterRouter from './routes/ebay-reputation-center';
import ebayDemandPlannerRouter from './routes/ebay-demand-planner';
import ebayContentStudioRouter from './routes/ebay-content-studio';
import ebayComplianceManagerRouter from './routes/ebay-compliance-manager';
import ebaySupplierHubRouter from './routes/ebay-supplier-hub';
import ebayReturnsManagerRouter from './routes/ebay-returns-manager';
import ebayNotificationHubRouter from './routes/ebay-notification-hub';
import ebayTaskManagerRouter from './routes/ebay-task-manager';
import ebayListingCalendarRouter from './routes/ebay-listing-calendar';
import ebayProfitDashboardRouter from './routes/ebay-profit-dashboard';
import ebayInventoryAlertsV2Router from './routes/ebay-inventory-alerts-v2';
import ebayCustomerServiceHubRouter from './routes/ebay-customer-service-hub';
import ebayOrderTrackingHubRouter from './routes/ebay-order-tracking-hub';
import ebayMarketplaceAnalyticsRouter from './routes/ebay-marketplace-analytics';
import ebayBulkPricingManagerRouter from './routes/ebay-bulk-pricing-manager';
import ebaySeoAnalyzerRouter from './routes/ebay-seo-analyzer';
import ebayImageOptimizerRouter from './routes/ebay-image-optimizer';
import ebayMultiCurrencyRouter from './routes/ebay-multi-currency';
import ebayShippingLabelRouter from './routes/ebay-shipping-label';
import ebayPriceHistoryRouter from './routes/ebay-price-history';
import ebayInventorySyncHubRouter from './routes/ebay-inventory-sync-hub';
import ebayReturnLabelRouter from './routes/ebay-return-label';
import ebayFeedbackResponseRouter from './routes/ebay-feedback-response';
import ebaySalesPerformanceRouter from './routes/ebay-sales-performance';
import ebayListingSchedulerRouter from './routes/ebay-listing-scheduler';
import ebayCustomerInsightsV2Router from './routes/ebay-customer-insights-v2';
import ebayBulkListingCreatorRouter from './routes/ebay-bulk-listing-creator';
import ebayCompetitorTrackerProRouter from './routes/ebay-competitor-tracker-pro';
import ebayProfitAnalyzerProRouter from './routes/ebay-profit-analyzer-pro';
import ebayOrderWorkflowManagerRouter from './routes/ebay-order-workflow-manager';
import ebaySkuGeneratorRouter from './routes/ebay-sku-generator';
import ebayShippingRateCalculatorRouter from './routes/ebay-shipping-rate-calculator';
import ebayProductSourcingHubRouter from './routes/ebay-product-sourcing-hub';
import ebayQualityControlManagerRouter from './routes/ebay-quality-control-manager';
import { ebayInventoryRestockPlannerRouter } from './routes/ebay-inventory-restock-planner';
import { ebayCustomerCommunicationHubRouter } from './routes/ebay-customer-communication-hub';
import { ebayDropshippingManagerRouter } from './routes/ebay-dropshipping-manager';
import { ebaySupplierInvoiceManagerRouter } from './routes/ebay-supplier-invoice-manager';
import { ebayProductBundleBuilderRouter } from './routes/ebay-product-bundle-builder';
import { ebayWarrantyTrackerRouter } from './routes/ebay-warranty-tracker';
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
app.use('/api/ebay-inventory-optimization', ebayInventoryOptimizationRouter);
app.use('/api/ebay-customer-lifecycle', ebayCustomerLifecycleRouter);
app.use('/api/ebay-dashboard', ebayDashboardRouter);
app.use('/api/ebay-multi-store', ebayMultiStoreRouter);
app.use('/api/ebay-api-monitor', ebayApiMonitorRouter);
app.use('/api/ebay-profit-calculator', ebayProfitCalculatorRouter);
app.use('/api/ebay-workflows', ebayWorkflowsRouter);
app.use('/api/ebay-variations', ebayVariationsRouter);
app.use('/api/ebay-bundles', ebayBundlesRouter);
app.use('/api/ebay-shipping-international', ebayShippingInternationalRouter);
app.use('/api/ebay-seller-hub', ebaySellerHubRouter);
app.use('/api/ebay-category-mapping', ebayCategoryMappingRouter);
app.use('/api/ebay-product-research', ebayProductResearchRouter);
app.use('/api/ebay-customer-communication', ebayCustomerCommunicationRouter);
app.use('/api/ebay-inventory-alerts', ebayInventoryAlertsRouter);
app.use('/api/ebay-review-management', ebayReviewManagementRouter);
app.use('/api/ebay-shipment-tracking', ebayShipmentTrackingRouter);
app.use('/api/ebay-alert-hub', ebayAlertHubRouter);
app.use('/api/ebay-templates-v2', ebayTemplatesV2Router);
app.use('/api/ebay-seo-optimizer', ebaySeoOptimizerRouter);
app.use('/api/ebay-listing-quality', ebayListingQualityRouter);
app.use('/api/ebay-tax-duty', ebayTaxDutyRouter);
app.use('/api/ebay-bulk-export-import', ebayBulkExportImportRouter);
app.use('/api/ebay-notification-center', ebayNotificationCenterRouter);
app.use('/api/ebay-activity-log', ebayActivityLogRouter);
app.use('/api/ebay-data-backup', ebayDataBackupRouter);
app.use('/api/ebay-performance-monitor', ebayPerformanceMonitorRouter);
app.use('/api/ebay-user-preferences', ebayUserPreferencesRouter);
app.use('/api/ebay-help-center', ebayHelpCenterRouter);
app.use('/api/ebay-webhook-manager', ebayWebhookManagerRouter);
app.use('/api/ebay-api-keys', ebayApiKeysRouter);
app.use('/api/ebay-audit-compliance', ebayAuditComplianceRouter);
app.use('/api/ebay-multi-user', ebayMultiUserRouter);
app.use('/api/ebay-advanced-reporting', ebayAdvancedReportingRouter);
app.use('/api/ebay-data-visualization', ebayDataVisualizationRouter);
app.use('/api/ebay-ml-insights', ebayMlInsightsRouter);
app.use('/api/ebay-integration-hub', ebayIntegrationHubRouter);
app.use('/api/ebay-mobile-api', ebayMobileApiRouter);
app.use('/api/ebay-realtime-collab', ebayRealtimeCollabRouter);
app.use('/api/ebay-custom-workflows', ebayCustomWorkflowsRouter);
app.use('/api/ebay-ai-assistant', ebayAiAssistantRouter);
app.use('/api/ebay-bulk-import-export', ebayBulkImportExportRouter);
app.use('/api/ebay-notification-center-v2', ebayNotificationCenterV2Router);
app.use('/api/ebay-customer-support-hub', ebayCustomerSupportHubRouter);
app.use('/api/ebay-advanced-search-v2', ebayAdvancedSearchV2Router);
app.use('/api/ebay-security-center', ebaySecurityCenterRouter);
app.use('/api/ebay-developer-portal', ebayDeveloperPortalRouter);
app.use('/api/ebay-analytics-dashboard-v2', ebayAnalyticsDashboardV2Router);
app.use('/api/ebay-multi-language-v2', ebayMultiLanguageV2Router);
app.use('/api/ebay-marketplace-sync', ebayMarketplaceSyncRouter);
app.use('/api/ebay-inventory-hub', ebayInventoryHubRouter);
app.use('/api/ebay-order-fulfillment', ebayOrderFulfillmentRouter);
app.use('/api/ebay-pricing-intelligence', ebayPricingIntelligenceRouter);
app.use('/api/ebay-seller-performance', ebaySellerPerformanceRouter);
app.use('/api/ebay-product-catalog', ebayProductCatalogRouter);
app.use('/api/ebay-shipping-calculator', ebayShippingCalculatorRouter);
app.use('/api/ebay-tax-management', ebayTaxManagementRouter);
app.use('/api/ebay-supplier-management', ebaySupplierManagementRouter);
app.use('/api/ebay-return-center', ebayReturnCenterRouter);
app.use('/api/ebay-marketing-hub', ebayMarketingHubRouter);
app.use('/api/ebay-inventory-forecasting', ebayInventoryForecastingRouter);
app.use('/api/ebay-customer-analytics', ebayCustomerAnalyticsRouter);
app.use('/api/ebay-order-automation', ebayOrderAutomationRouter);
app.use('/api/ebay-competitive-intelligence', ebayCompetitiveIntelligenceRouter);
app.use('/api/ebay/revenue-optimization', ebayRevenueOptimizationRouter);
app.use('/api/ebay/financial-reporting', ebayFinancialReportingRouter);
app.use('/api/ebay/business-analytics', ebayBusinessAnalyticsRouter);
app.use('/api/ebay/cross-border-hub', ebayCrossBorderHubRouter);
app.use('/api/ebay/quality-control', ebayQualityControlRouter);
app.use('/api/ebay/store-management', ebayStoreManagementRouter);
app.use('/api/ebay/workflow-automation', ebayWorkflowAutomationRouter);
app.use('/api/ebay/insights-dashboard', ebayInsightsDashboardRouter);
app.use('/api/ebay/account-settings', ebayAccountSettingsRouter);
app.use('/api/ebay/compliance-center', ebayComplianceCenterRouter);
app.use('/api/ebay/performance-analytics', ebayPerformanceAnalyticsRouter);
app.use('/api/ebay/market-intelligence', ebayMarketIntelligenceRouter);
app.use('/api/ebay/automation-hub', ebayAutomationHubRouter);
app.use('/api/ebay/data-center', ebayDataCenterRouter);
app.use('/api/ebay/integration-marketplace', ebayIntegrationMarketplaceRouter);
app.use('/api/ebay/smart-scheduler', ebaySmartSchedulerRouter);
app.use('/api/ebay/customer-insights', ebayCustomerInsightsRouter);
app.use('/api/ebay/listing-optimizer', ebayListingOptimizerRouter);
app.use('/api/ebay/order-hub', ebayOrderHubRouter);
app.use('/api/ebay/shipping-center', ebayShippingCenterRouter);
app.use('/api/ebay/payment-gateway', ebayPaymentGatewayRouter);
app.use('/api/ebay/analytics-hub', ebayAnalyticsHubRouter);
app.use('/api/ebay/reputation-center', ebayReputationCenterRouter);
app.use('/api/ebay/demand-planner', ebayDemandPlannerRouter);
app.use('/api/ebay/content-studio', ebayContentStudioRouter);
app.use('/api/ebay/compliance-manager', ebayComplianceManagerRouter);
app.use('/api/ebay/supplier-hub', ebaySupplierHubRouter);
app.use('/api/ebay/returns-manager', ebayReturnsManagerRouter);
app.use('/api/ebay/notification-hub', ebayNotificationHubRouter);
app.use('/api/ebay/task-manager', ebayTaskManagerRouter);
app.use('/api/ebay/listing-calendar', ebayListingCalendarRouter);
app.use('/api/ebay/profit-dashboard', ebayProfitDashboardRouter);
app.use('/api/ebay/inventory-alerts-v2', ebayInventoryAlertsV2Router);
app.use('/api/ebay/customer-service-hub', ebayCustomerServiceHubRouter);
app.use('/api/ebay/order-tracking-hub', ebayOrderTrackingHubRouter);
app.use('/api/ebay/marketplace-analytics', ebayMarketplaceAnalyticsRouter);
app.use('/api/ebay/bulk-pricing-manager', ebayBulkPricingManagerRouter);
app.use('/api/ebay/seo-analyzer', ebaySeoAnalyzerRouter);
app.use('/api/ebay/image-optimizer', ebayImageOptimizerRouter);
app.use('/api/ebay/multi-currency', ebayMultiCurrencyRouter);
app.use('/api/ebay/shipping-label', ebayShippingLabelRouter);
app.use('/api/ebay/price-history', ebayPriceHistoryRouter);
app.use('/api/ebay/inventory-sync-hub', ebayInventorySyncHubRouter);
app.use('/api/ebay/return-label', ebayReturnLabelRouter);
app.use('/api/ebay/feedback-response', ebayFeedbackResponseRouter);
app.use('/api/ebay/sales-performance', ebaySalesPerformanceRouter);
app.use('/api/ebay/listing-scheduler', ebayListingSchedulerRouter);
app.use('/api/ebay/customer-insights-v2', ebayCustomerInsightsV2Router);
app.use('/api/ebay/bulk-listing-creator', ebayBulkListingCreatorRouter);
app.use('/api/ebay/competitor-tracker-pro', ebayCompetitorTrackerProRouter);
app.use('/api/ebay/profit-analyzer-pro', ebayProfitAnalyzerProRouter);
app.use('/api/ebay/order-workflow-manager', ebayOrderWorkflowManagerRouter);
app.use('/api/ebay/sku-generator', ebaySkuGeneratorRouter);
app.use('/api/ebay/shipping-rate-calculator', ebayShippingRateCalculatorRouter);
app.use('/api/ebay/product-sourcing-hub', ebayProductSourcingHubRouter);
app.use('/api/ebay/quality-control-manager', ebayQualityControlManagerRouter);
app.use('/api/ebay/inventory-restock-planner', ebayInventoryRestockPlannerRouter);
app.use('/api/ebay/customer-communication-hub', ebayCustomerCommunicationHubRouter);
app.use('/api/ebay/dropshipping-manager', ebayDropshippingManagerRouter);
app.use('/api/ebay/supplier-invoice-manager', ebaySupplierInvoiceManagerRouter);
app.use('/api/ebay/product-bundle-builder', ebayProductBundleBuilderRouter);
app.use('/api/ebay/warranty-tracker', ebayWarrantyTrackerRouter);

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
