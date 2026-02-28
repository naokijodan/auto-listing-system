
/**
 * カスタムレポートAPI
 * Phase 84: 高度なレポーティング
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import crypto from 'crypto';

const router = Router();

/**
 * スラグを生成
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) + '-' + Date.now().toString(36);
}

/**
 * @swagger
 * /api/custom-reports/stats:
 *   get:
 *     summary: レポート統計を取得
 *     tags: [CustomReports]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalReports,
      totalDashboards,
      totalTemplates,
      totalExecutions,
      byType,
      recentExecutions,
    ] = await Promise.all([
      prisma.customReport.count(),
      prisma.sharedDashboard.count(),
      prisma.reportTemplate.count(),
      prisma.reportExecution.count(),
      prisma.customReport.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.reportExecution.findMany({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      totalReports,
      totalDashboards,
      totalTemplates,
      totalExecutions,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentExecutions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/types:
 *   get:
 *     summary: レポートタイプ一覧を取得
 *     tags: [CustomReports]
 */
router.get('/types', async (req, res) => {
  res.json({
    reportTypes: [
      { value: 'TABLE', label: 'テーブル', description: 'データをテーブル形式で表示' },
      { value: 'CHART', label: 'チャート', description: 'グラフやチャートで可視化' },
      { value: 'PIVOT', label: 'ピボット', description: 'ピボットテーブルで集計' },
      { value: 'DASHBOARD', label: 'ダッシュボード', description: '複数ウィジェットの組み合わせ' },
      { value: 'KPI', label: 'KPIカード', description: '主要指標をカードで表示' },
    ],
    dataSources: [
      { value: 'ORDERS', label: '注文データ' },
      { value: 'PRODUCTS', label: '商品データ' },
      { value: 'LISTINGS', label: '出品データ' },
      { value: 'CUSTOMERS', label: '顧客データ' },
      { value: 'INVENTORY', label: '在庫データ' },
      { value: 'SALES', label: '売上データ' },
      { value: 'SHIPMENTS', label: '発送データ' },
    ],
    chartTypes: [
      { value: 'LINE', label: '折れ線グラフ' },
      { value: 'BAR', label: '棒グラフ' },
      { value: 'PIE', label: '円グラフ' },
      { value: 'DOUGHNUT', label: 'ドーナツグラフ' },
      { value: 'AREA', label: 'エリアチャート' },
      { value: 'SCATTER', label: '散布図' },
      { value: 'FUNNEL', label: 'ファネルチャート' },
      { value: 'GAUGE', label: 'ゲージチャート' },
    ],
    exportFormats: [
      { value: 'PDF', label: 'PDF' },
      { value: 'EXCEL', label: 'Excel' },
      { value: 'CSV', label: 'CSV' },
      { value: 'JSON', label: 'JSON' },
    ],
    visibilities: [
      { value: 'PRIVATE', label: '非公開', description: '作成者のみ' },
      { value: 'TEAM', label: 'チーム', description: 'チームメンバーに共有' },
      { value: 'ORGANIZATION', label: '組織', description: '組織全体に共有' },
      { value: 'PUBLIC', label: '公開', description: '全ユーザーに公開' },
    ],
  });
});

/**
 * @swagger
 * /api/custom-reports:
 *   get:
 *     summary: カスタムレポート一覧を取得
 *     tags: [CustomReports]
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      type,
      dataSource,
      visibility,
      createdBy,
      isFavorite,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (dataSource) where.dataSource = dataSource;
    if (visibility) where.visibility = visibility;
    if (createdBy) where.createdBy = createdBy;
    if (isFavorite !== undefined) where.isFavorite = isFavorite === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [reports, total] = await Promise.all([
      prisma.customReport.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.customReport.count({ where }),
    ]);

    res.json({
      data: reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports:
 *   post:
 *     summary: カスタムレポートを作成
 *     tags: [CustomReports]
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      type,
      dataSource,
      query,
      columns,
      filters,
      sorting,
      groupBy,
      aggregations,
      chartType,
      chartConfig,
      visibility,
      createdBy,
      organizationId,
    } = req.body;

    if (!name || !type || !dataSource || !query || !columns) {
      return res.status(400).json({
        error: 'name, type, dataSource, query, columns are required',
      });
    }

    const report = await prisma.customReport.create({
      data: {
        name,
        description,
        slug: generateSlug(name),
        type,
        dataSource,
        query,
        columns,
        filters: filters || [],
        sorting,
        groupBy: groupBy || [],
        aggregations: aggregations || [],
        chartType,
        chartConfig: chartConfig || {},
        visibility: visibility || 'PRIVATE',
        createdBy,
        organizationId,
      },
    });

    logger.info(`Custom report created: ${report.id} - ${report.name}`);

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/{id}:
 *   get:
 *     summary: カスタムレポート詳細を取得
 *     tags: [CustomReports]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const report = await prisma.customReport.findUnique({
      where: { id: req.params.id },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // 閲覧数を更新
    await prisma.customReport.update({
      where: { id: req.params.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/{id}:
 *   patch:
 *     summary: カスタムレポートを更新
 *     tags: [CustomReports]
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name,
      description,
      query,
      columns,
      filters,
      sorting,
      groupBy,
      aggregations,
      chartType,
      chartConfig,
      visibility,
      isFavorite,
      scheduleEnabled,
      scheduleCron,
      scheduleRecipients,
      scheduleFormat,
    } = req.body;

    const report = await prisma.customReport.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(query && { query }),
        ...(columns && { columns }),
        ...(filters && { filters }),
        ...(sorting !== undefined && { sorting }),
        ...(groupBy && { groupBy }),
        ...(aggregations && { aggregations }),
        ...(chartType !== undefined && { chartType }),
        ...(chartConfig && { chartConfig }),
        ...(visibility && { visibility }),
        ...(isFavorite !== undefined && { isFavorite }),
        ...(scheduleEnabled !== undefined && { scheduleEnabled }),
        ...(scheduleCron !== undefined && { scheduleCron }),
        ...(scheduleRecipients && { scheduleRecipients }),
        ...(scheduleFormat && { scheduleFormat }),
      },
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/{id}:
 *   delete:
 *     summary: カスタムレポートを削除
 *     tags: [CustomReports]
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.customReport.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/{id}/execute:
 *   post:
 *     summary: レポートを実行
 *     tags: [CustomReports]
 */
router.post('/:id/execute', async (req, res, next) => {
  try {
    const { parameters, dateRange, executedBy } = req.body;

    const report = await prisma.customReport.findUnique({
      where: { id: req.params.id },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // 実行ログを作成
    const execution = await prisma.reportExecution.create({
      data: {
        reportId: report.id,
        status: 'GENERATING',
        startedAt: new Date(),
      },
    });

    // 実際のデータ取得（簡易実装）
    let resultData: Record<string, unknown>[] = [];
    let rowCount = 0;

    try {
      switch (report.dataSource) {
        case 'ORDERS':
          const orders = await prisma.order.findMany({
            take: 100,
            orderBy: { orderedAt: 'desc' },
          });
          resultData = orders as unknown as Record<string, unknown>[];
          rowCount = orders.length;
          break;

        case 'PRODUCTS':
          const products = await prisma.product.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
          });
          resultData = products as unknown as Record<string, unknown>[];
          rowCount = products.length;
          break;

        case 'CUSTOMERS':
          const customers = await prisma.customer.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
          });
          resultData = customers as unknown as Record<string, unknown>[];
          rowCount = customers.length;
          break;

        case 'SALES':
          const sales = await prisma.sale.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
          });
          resultData = sales as unknown as Record<string, unknown>[];
          rowCount = sales.length;
          break;

        default:
          resultData = [];
      }

      // 実行完了
      const completedExecution = await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          duration: Date.now() - execution.startedAt.getTime(),
        },
      });

      // レポートの最終生成日を更新
      await prisma.customReport.update({
        where: { id: req.params.id },
        data: { lastGeneratedAt: new Date() },
      });

      res.json({
        execution: completedExecution,
        data: resultData,
      });
    } catch (error) {
      // 実行失敗
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/{id}/share:
 *   post:
 *     summary: レポートを共有
 *     tags: [CustomReports]
 */
router.post('/:id/share', async (req, res, next) => {
  try {
    const { userIds, organizationIds, visibility } = req.body;

    const report = await prisma.customReport.update({
      where: { id: req.params.id },
      data: {
        ...(userIds && { sharedWith: userIds }),
        ...(organizationIds && { sharedWithOrgs: organizationIds }),
        ...(visibility && { visibility }),
      },
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// ========================================
// ダッシュボード
// ========================================

/**
 * @swagger
 * /api/custom-reports/dashboards:
 *   get:
 *     summary: 共有ダッシュボード一覧を取得
 *     tags: [CustomReports]
 */
router.get('/dashboards/list', async (req, res, next) => {
  try {
    const { visibility, createdBy, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (visibility) where.visibility = visibility;
    if (createdBy) where.createdBy = createdBy;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [dashboards, total] = await Promise.all([
      prisma.sharedDashboard.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.sharedDashboard.count({ where }),
    ]);

    res.json({
      data: dashboards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/dashboards:
 *   post:
 *     summary: 共有ダッシュボードを作成
 *     tags: [CustomReports]
 */
router.post('/dashboards', async (req, res, next) => {
  try {
    const {
      name,
      description,
      layout,
      widgets,
      globalFilters,
      defaultDateRange,
      autoRefresh,
      refreshInterval,
      visibility,
      createdBy,
      organizationId,
    } = req.body;

    if (!name || !layout) {
      return res.status(400).json({ error: 'name and layout are required' });
    }

    const dashboard = await prisma.sharedDashboard.create({
      data: {
        name,
        description,
        slug: generateSlug(name),
        layout,
        widgets: widgets || [],
        globalFilters: globalFilters || [],
        defaultDateRange: defaultDateRange || 'last_30_days',
        autoRefresh: autoRefresh ?? true,
        refreshInterval: refreshInterval || 300,
        visibility: visibility || 'PRIVATE',
        createdBy,
        organizationId,
      },
    });

    logger.info(`Dashboard created: ${dashboard.id} - ${dashboard.name}`);

    res.status(201).json(dashboard);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/dashboards/{id}:
 *   get:
 *     summary: 共有ダッシュボード詳細を取得
 *     tags: [CustomReports]
 */
router.get('/dashboards/:id', async (req, res, next) => {
  try {
    const dashboard = await prisma.sharedDashboard.findUnique({
      where: { id: req.params.id },
    });

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    // 閲覧数を更新
    await prisma.sharedDashboard.update({
      where: { id: req.params.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/dashboards/{id}/embed:
 *   post:
 *     summary: 埋め込みを有効化
 *     tags: [CustomReports]
 */
router.post('/dashboards/:id/embed', async (req, res, next) => {
  try {
    const { enabled, domains } = req.body;

    const embedToken = enabled ? crypto.randomBytes(32).toString('hex') : null;

    const dashboard = await prisma.sharedDashboard.update({
      where: { id: req.params.id },
      data: {
        embedEnabled: enabled,
        embedToken,
        embedDomains: domains || [],
      },
    });

    res.json({
      embedEnabled: dashboard.embedEnabled,
      embedToken: dashboard.embedToken,
      embedUrl: dashboard.embedToken
        ? `/embed/dashboard/${dashboard.embedToken}`
        : null,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// テンプレート
// ========================================

/**
 * @swagger
 * /api/custom-reports/templates:
 *   get:
 *     summary: レポートテンプレート一覧を取得
 *     tags: [CustomReports]
 */
router.get('/templates/list', async (req, res, next) => {
  try {
    const { category, isSystem } = req.query;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (isSystem !== undefined) where.isSystem = isSystem === 'true';

    const templates = await prisma.reportTemplate.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(templates);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/custom-reports/templates/{id}/use:
 *   post:
 *     summary: テンプレートからレポートを作成
 *     tags: [CustomReports]
 */
router.post('/templates/:id/use', async (req, res, next) => {
  try {
    const { name, createdBy, variables } = req.body;

    const template = await prisma.reportTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // テンプレートからレポートを作成
    const report = await prisma.customReport.create({
      data: {
        name: name || `${template.name}のコピー`,
        description: template.description,
        slug: generateSlug(name || template.name),
        type: 'TABLE',
        dataSource: 'ORDERS',
        query: template.dataSources || {},
        columns: template.sections || [],
        filters: template.charts as any || [],
        chartConfig: template.customStyles || {},
        createdBy: createdBy || 'system',
      },
    });

    logger.info(`Report created from template: ${report.id} from ${template.id}`);

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});

export { router as customReportsRouter };
