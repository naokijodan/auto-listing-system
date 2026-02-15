import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@rakuda/logger';

const router = Router();

// ============================================
// 型定義
// ============================================

// パフォーマンス指標
const PERFORMANCE_METRICS = {
  TRANSACTION_DEFECT_RATE: { id: 'TRANSACTION_DEFECT_RATE', name: '取引欠陥率', target: 2, unit: '%' },
  LATE_SHIPMENT_RATE: { id: 'LATE_SHIPMENT_RATE', name: '遅延発送率', target: 3, unit: '%' },
  CASES_CLOSED_WITHOUT_RESOLUTION: { id: 'CASES_CLOSED_WITHOUT_RESOLUTION', name: '未解決クローズケース', target: 0.3, unit: '%' },
  TRACKING_UPLOADED_RATE: { id: 'TRACKING_UPLOADED_RATE', name: '追跡番号アップロード率', target: 95, unit: '%' },
  VALID_TRACKING_RATE: { id: 'VALID_TRACKING_RATE', name: '有効追跡率', target: 95, unit: '%' },
  DELIVERY_RATE: { id: 'DELIVERY_RATE', name: '配達率', target: 90, unit: '%' },
} as const;

// セラーレベル
const SELLER_LEVELS = {
  TOP_RATED: { id: 'TOP_RATED', name: 'トップセラー', color: 'gold', benefits: ['20%割引手数料', '優先検索表示', 'Top Ratedバッジ'] },
  ABOVE_STANDARD: { id: 'ABOVE_STANDARD', name: '標準以上', color: 'green', benefits: ['通常手数料', '標準検索表示'] },
  BELOW_STANDARD: { id: 'BELOW_STANDARD', name: '標準以下', color: 'red', benefits: ['ペナルティ手数料', '検索順位低下', '出品制限'] },
} as const;

// レポートタイプ
const REPORT_TYPES = {
  SALES: { id: 'SALES', name: '売上レポート', icon: 'dollar-sign' },
  TRAFFIC: { id: 'TRAFFIC', name: 'トラフィックレポート', icon: 'bar-chart' },
  LISTING: { id: 'LISTING', name: '出品レポート', icon: 'package' },
  SELLER_PERFORMANCE: { id: 'SELLER_PERFORMANCE', name: 'パフォーマンスレポート', icon: 'activity' },
  RETURN: { id: 'RETURN', name: '返品レポート', icon: 'rotate-ccw' },
  PAYMENT: { id: 'PAYMENT', name: '支払いレポート', icon: 'credit-card' },
  BUYER: { id: 'BUYER', name: 'バイヤーレポート', icon: 'users' },
} as const;

// ============================================
// バリデーションスキーマ
// ============================================

const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const reportRequestSchema = z.object({
  reportType: z.enum(['SALES', 'TRAFFIC', 'LISTING', 'SELLER_PERFORMANCE', 'RETURN', 'PAYMENT', 'BUYER']),
  dateRange: dateRangeSchema,
  granularity: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
  filters: z.object({
    categoryId: z.string().optional(),
    listingId: z.string().optional(),
    marketplace: z.string().optional(),
  }).optional(),
});

const taskSchema = z.object({
  type: z.enum(['RESPOND_TO_CASE', 'SHIP_ORDER', 'UPLOAD_TRACKING', 'RESOLVE_RETURN', 'UPDATE_LISTING', 'REVIEW_FEEDBACK']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// ============================================
// ダッシュボード（セラーハブホーム）
// ============================================

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const dashboard = {
      // セラーステータス
      sellerStatus: {
        level: 'TOP_RATED',
        levelName: 'トップセラー',
        evaluationDate: '2026-02-20',
        daysUntilEvaluation: 5,
        isAtRisk: false,
      },
      // サマリー
      summary: {
        todaySales: 1234.56,
        todayOrders: 23,
        pendingShipments: 12,
        openCases: 2,
        pendingReturns: 3,
        unreadMessages: 8,
      },
      // パフォーマンス指標
      performance: {
        transactionDefectRate: { current: 0.8, target: 2, status: 'GOOD' },
        lateShipmentRate: { current: 1.2, target: 3, status: 'GOOD' },
        casesClosedWithoutResolution: { current: 0.1, target: 0.3, status: 'GOOD' },
        trackingUploadedRate: { current: 98.5, target: 95, status: 'GOOD' },
        validTrackingRate: { current: 97.2, target: 95, status: 'GOOD' },
        deliveryRate: { current: 94.5, target: 90, status: 'GOOD' },
      },
      // 売上トレンド
      salesTrend: {
        daily: [
          { date: '2026-02-08', sales: 1456.78, orders: 28 },
          { date: '2026-02-09', sales: 1234.56, orders: 24 },
          { date: '2026-02-10', sales: 1678.90, orders: 32 },
          { date: '2026-02-11', sales: 1345.67, orders: 26 },
          { date: '2026-02-12', sales: 1567.89, orders: 30 },
          { date: '2026-02-13', sales: 1890.12, orders: 36 },
          { date: '2026-02-14', sales: 2123.45, orders: 41 },
        ],
        comparison: {
          thisWeek: 11297.37,
          lastWeek: 9876.54,
          changePercent: 14.4,
        },
      },
      // アクションアイテム
      actionItems: [
        { type: 'SHIP_ORDER', count: 12, priority: 'HIGH', dueIn: '8時間' },
        { type: 'RESPOND_TO_CASE', count: 2, priority: 'HIGH', dueIn: '24時間' },
        { type: 'UPLOAD_TRACKING', count: 5, priority: 'MEDIUM', dueIn: '48時間' },
        { type: 'RESOLVE_RETURN', count: 3, priority: 'MEDIUM', dueIn: '3日' },
      ],
      // トップ商品
      topListings: [
        { id: 'lst-001', title: 'Vintage Camera', sales: 4567.89, orders: 45, views: 1234 },
        { id: 'lst-002', title: 'Leather Bag', sales: 3456.78, orders: 38, views: 987 },
        { id: 'lst-003', title: 'Watch Collection', sales: 2345.67, orders: 28, views: 876 },
      ],
      // アラート
      alerts: [
        { type: 'WARNING', message: '3件の出品で在庫が少なくなっています', link: '/ebay/inventory' },
        { type: 'INFO', message: '新しいプロモーションが利用可能です', link: '/ebay/promotions' },
      ],
    };

    res.json(dashboard);
  } catch (error) {
    logger.error('Failed to get seller hub dashboard', error);
    res.status(500).json({ error: 'ダッシュボードの取得に失敗しました' });
  }
});

// ============================================
// パフォーマンス
// ============================================

router.get('/performance', async (_req: Request, res: Response) => {
  try {
    const performance = {
      currentLevel: 'TOP_RATED',
      levelDetails: SELLER_LEVELS.TOP_RATED,
      evaluationPeriod: {
        start: '2025-11-15',
        end: '2026-02-14',
        nextEvaluation: '2026-02-20',
      },
      metrics: [
        {
          id: 'TRANSACTION_DEFECT_RATE',
          name: '取引欠陥率',
          current: 0.8,
          target: 2,
          trend: 'DOWN',
          status: 'GOOD',
          history: [
            { date: '2025-12', value: 1.2 },
            { date: '2026-01', value: 0.9 },
            { date: '2026-02', value: 0.8 },
          ],
        },
        {
          id: 'LATE_SHIPMENT_RATE',
          name: '遅延発送率',
          current: 1.2,
          target: 3,
          trend: 'STABLE',
          status: 'GOOD',
          history: [
            { date: '2025-12', value: 1.5 },
            { date: '2026-01', value: 1.3 },
            { date: '2026-02', value: 1.2 },
          ],
        },
        {
          id: 'CASES_CLOSED_WITHOUT_RESOLUTION',
          name: '未解決クローズケース',
          current: 0.1,
          target: 0.3,
          trend: 'DOWN',
          status: 'GOOD',
          history: [
            { date: '2025-12', value: 0.2 },
            { date: '2026-01', value: 0.15 },
            { date: '2026-02', value: 0.1 },
          ],
        },
        {
          id: 'TRACKING_UPLOADED_RATE',
          name: '追跡番号アップロード率',
          current: 98.5,
          target: 95,
          trend: 'UP',
          status: 'GOOD',
          history: [
            { date: '2025-12', value: 96.5 },
            { date: '2026-01', value: 97.8 },
            { date: '2026-02', value: 98.5 },
          ],
        },
        {
          id: 'VALID_TRACKING_RATE',
          name: '有効追跡率',
          current: 97.2,
          target: 95,
          trend: 'UP',
          status: 'GOOD',
          history: [
            { date: '2025-12', value: 95.8 },
            { date: '2026-01', value: 96.5 },
            { date: '2026-02', value: 97.2 },
          ],
        },
      ],
      recommendations: [
        '追跡番号のアップロード率をさらに向上させるため、発送後すぐに追跡番号を入力してください',
        '返品リクエストには24時間以内に対応することで、未解決ケース率を低く維持できます',
      ],
    };

    res.json(performance);
  } catch (error) {
    logger.error('Failed to get seller performance', error);
    res.status(500).json({ error: 'パフォーマンスの取得に失敗しました' });
  }
});

// ============================================
// 売上分析
// ============================================

router.get('/sales', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    const sales = {
      period,
      summary: {
        totalSales: 45678.90,
        totalOrders: 567,
        averageOrderValue: 80.56,
        totalFees: 5678.90,
        netRevenue: 40000.00,
      },
      comparison: {
        salesChange: 12.5,
        ordersChange: 8.3,
        aovChange: 3.8,
      },
      byCategory: [
        { category: 'Electronics', sales: 15678.90, orders: 156, percentage: 34.3 },
        { category: 'Clothing', sales: 12345.67, orders: 178, percentage: 27.0 },
        { category: 'Collectibles', sales: 8765.43, orders: 98, percentage: 19.2 },
        { category: 'Home & Garden', sales: 5432.10, orders: 78, percentage: 11.9 },
        { category: 'Other', sales: 3456.80, orders: 57, percentage: 7.6 },
      ],
      byMarketplace: [
        { marketplace: 'ebay.com', sales: 32456.78, orders: 398, percentage: 71.0 },
        { marketplace: 'ebay.co.uk', sales: 8765.43, orders: 112, percentage: 19.2 },
        { marketplace: 'ebay.de', sales: 4456.69, orders: 57, percentage: 9.8 },
      ],
      trend: [
        { date: '2026-01-16', sales: 1234.56, orders: 15 },
        { date: '2026-01-17', sales: 1567.89, orders: 19 },
        { date: '2026-01-18', sales: 1345.67, orders: 16 },
        // ... more dates
      ],
      topProducts: [
        { id: 'lst-001', title: 'Vintage Camera Kit', sales: 5678.90, orders: 56, units: 62 },
        { id: 'lst-002', title: 'Leather Messenger Bag', sales: 4567.89, orders: 48, units: 52 },
        { id: 'lst-003', title: 'Collectible Watch', sales: 3456.78, orders: 34, units: 34 },
        { id: 'lst-004', title: 'Designer Sunglasses', sales: 2345.67, orders: 45, units: 50 },
        { id: 'lst-005', title: 'Vintage Record Player', sales: 2234.56, orders: 22, units: 24 },
      ],
    };

    res.json(sales);
  } catch (error) {
    logger.error('Failed to get sales data', error);
    res.status(500).json({ error: '売上データの取得に失敗しました' });
  }
});

// ============================================
// トラフィック分析
// ============================================

router.get('/traffic', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    const traffic = {
      period,
      summary: {
        totalImpressions: 156789,
        totalPageViews: 45678,
        clickThroughRate: 2.91,
        conversionRate: 1.24,
      },
      comparison: {
        impressionsChange: 8.5,
        pageViewsChange: 12.3,
        ctrChange: 0.15,
        conversionChange: 0.08,
      },
      bySource: [
        { source: 'eBay Search', impressions: 89456, pageViews: 26789, percentage: 57.0 },
        { source: 'Direct', impressions: 34567, pageViews: 10345, percentage: 22.0 },
        { source: 'External Search', impressions: 23456, pageViews: 5678, percentage: 15.0 },
        { source: 'Social', impressions: 9310, pageViews: 2866, percentage: 6.0 },
      ],
      byDevice: [
        { device: 'Mobile', percentage: 62.5 },
        { device: 'Desktop', percentage: 28.3 },
        { device: 'Tablet', percentage: 9.2 },
      ],
      byCountry: [
        { country: 'US', flag: '🇺🇸', pageViews: 23456, percentage: 51.4 },
        { country: 'UK', flag: '🇬🇧', pageViews: 8765, percentage: 19.2 },
        { country: 'DE', flag: '🇩🇪', pageViews: 5678, percentage: 12.4 },
        { country: 'AU', flag: '🇦🇺', pageViews: 4321, percentage: 9.5 },
        { country: 'CA', flag: '🇨🇦', pageViews: 3458, percentage: 7.5 },
      ],
      trend: [
        { date: '2026-02-08', impressions: 5234, pageViews: 1567 },
        { date: '2026-02-09', impressions: 5678, pageViews: 1678 },
        { date: '2026-02-10', impressions: 4987, pageViews: 1456 },
        { date: '2026-02-11', impressions: 5456, pageViews: 1589 },
        { date: '2026-02-12', impressions: 6123, pageViews: 1789 },
        { date: '2026-02-13', impressions: 6789, pageViews: 1987 },
        { date: '2026-02-14', impressions: 7234, pageViews: 2134 },
      ],
    };

    res.json(traffic);
  } catch (error) {
    logger.error('Failed to get traffic data', error);
    res.status(500).json({ error: 'トラフィックデータの取得に失敗しました' });
  }
});

// ============================================
// 出品分析
// ============================================

router.get('/listings-analysis', async (_req: Request, res: Response) => {
  try {
    const analysis = {
      summary: {
        totalListings: 456,
        activeListings: 398,
        outOfStock: 23,
        endingSoon: 15,
        needsAttention: 12,
      },
      performance: {
        topPerformers: [
          { id: 'lst-001', title: 'Vintage Camera', views: 1234, watchers: 45, conversionRate: 3.6 },
          { id: 'lst-002', title: 'Leather Bag', views: 987, watchers: 38, conversionRate: 3.8 },
          { id: 'lst-003', title: 'Watch Set', views: 876, watchers: 32, conversionRate: 3.2 },
        ],
        underperformers: [
          { id: 'lst-050', title: 'Old Book Set', views: 23, watchers: 0, conversionRate: 0, suggestion: '価格を下げるか、タイトルを最適化してください' },
          { id: 'lst-051', title: 'Generic Phone Case', views: 45, watchers: 1, conversionRate: 0, suggestion: '写真を追加してください' },
        ],
      },
      qualityScore: {
        overall: 87,
        breakdown: {
          titleQuality: 92,
          imageQuality: 85,
          descriptionQuality: 88,
          pricingCompetitiveness: 82,
          shippingOptions: 89,
        },
      },
      recommendations: [
        { listingId: 'lst-020', issue: 'LOW_IMAGES', suggestion: '画像を追加して商品の魅力を高めましょう（現在1枚、推奨5枚以上）' },
        { listingId: 'lst-021', issue: 'SHORT_DESCRIPTION', suggestion: '説明文を充実させてSEOを改善しましょう' },
        { listingId: 'lst-022', issue: 'HIGH_PRICE', suggestion: '競合より15%高い価格設定です。価格を見直してください' },
      ],
    };

    res.json(analysis);
  } catch (error) {
    logger.error('Failed to get listings analysis', error);
    res.status(500).json({ error: '出品分析の取得に失敗しました' });
  }
});

// ============================================
// タスク管理
// ============================================

router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { status = 'PENDING', priority } = req.query;

    const tasks = {
      summary: {
        total: 32,
        pending: 18,
        inProgress: 8,
        completed: 6,
        overdue: 4,
      },
      tasks: [
        {
          id: 'task-001',
          type: 'SHIP_ORDER',
          title: '注文 #12345 を発送',
          description: 'Vintage Camera Kit - バイヤー: john_doe',
          priority: 'HIGH',
          status: 'PENDING',
          dueDate: '2026-02-15T18:00:00Z',
          isOverdue: false,
          orderId: 'ord-12345',
        },
        {
          id: 'task-002',
          type: 'RESPOND_TO_CASE',
          title: 'ケース #C789 に対応',
          description: '商品が届かないとの報告 - バイヤー: jane_smith',
          priority: 'HIGH',
          status: 'PENDING',
          dueDate: '2026-02-15T23:59:59Z',
          isOverdue: false,
          caseId: 'case-789',
        },
        {
          id: 'task-003',
          type: 'UPLOAD_TRACKING',
          title: '追跡番号をアップロード',
          description: '5件の発送済み注文に追跡番号が未入力です',
          priority: 'MEDIUM',
          status: 'PENDING',
          dueDate: '2026-02-16T23:59:59Z',
          isOverdue: false,
          orderIds: ['ord-123', 'ord-124', 'ord-125', 'ord-126', 'ord-127'],
        },
        {
          id: 'task-004',
          type: 'RESOLVE_RETURN',
          title: '返品リクエスト #R456 を処理',
          description: 'サイズが合わないとの返品申請',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          dueDate: '2026-02-17T23:59:59Z',
          isOverdue: false,
          returnId: 'ret-456',
        },
      ],
    };

    res.json(tasks);
  } catch (error) {
    logger.error('Failed to get tasks', error);
    res.status(500).json({ error: 'タスクの取得に失敗しました' });
  }
});

router.put('/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status, notes } = req.body;

    logger.info(`Task updated: ${taskId}, status: ${status}`);

    res.json({
      message: 'タスクを更新しました',
      task: { id: taskId, status, notes, updatedAt: new Date().toISOString() },
    });
  } catch (error) {
    logger.error('Failed to update task', error);
    res.status(500).json({ error: 'タスクの更新に失敗しました' });
  }
});

// ============================================
// レポート
// ============================================

router.get('/reports', async (_req: Request, res: Response) => {
  try {
    res.json({
      availableReports: Object.values(REPORT_TYPES),
      recentReports: [
        { id: 'rpt-001', type: 'SALES', name: '週間売上レポート', createdAt: '2026-02-14T10:00:00Z', status: 'READY' },
        { id: 'rpt-002', type: 'TRAFFIC', name: 'トラフィック分析', createdAt: '2026-02-13T15:30:00Z', status: 'READY' },
        { id: 'rpt-003', type: 'SELLER_PERFORMANCE', name: 'パフォーマンスレポート', createdAt: '2026-02-12T09:00:00Z', status: 'READY' },
      ],
      scheduledReports: [
        { id: 'sch-001', type: 'SALES', frequency: 'WEEKLY', nextRun: '2026-02-21T09:00:00Z' },
        { id: 'sch-002', type: 'SELLER_PERFORMANCE', frequency: 'MONTHLY', nextRun: '2026-03-01T09:00:00Z' },
      ],
    });
  } catch (error) {
    logger.error('Failed to get reports', error);
    res.status(500).json({ error: 'レポートの取得に失敗しました' });
  }
});

router.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const validated = reportRequestSchema.parse(req.body);

    const report = {
      id: `rpt-${Date.now()}`,
      type: validated.reportType,
      dateRange: validated.dateRange,
      status: 'PROCESSING',
      createdAt: new Date().toISOString(),
    };

    logger.info(`Report generation started: ${report.id}`);

    res.status(202).json({
      message: 'レポート生成を開始しました',
      report,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'バリデーションエラー', details: error.errors });
    }
    logger.error('Failed to generate report', error);
    res.status(500).json({ error: 'レポート生成に失敗しました' });
  }
});

router.get('/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const report = {
      id: reportId,
      type: 'SALES',
      name: '週間売上レポート',
      dateRange: {
        start: '2026-02-08',
        end: '2026-02-14',
      },
      status: 'READY',
      data: {
        totalSales: 11297.37,
        totalOrders: 217,
        averageOrderValue: 52.06,
        // ... detailed data
      },
      createdAt: '2026-02-14T10:00:00Z',
      downloadUrl: `/api/ebay-seller-hub/reports/${reportId}/download`,
    };

    res.json(report);
  } catch (error) {
    logger.error('Failed to get report', error);
    res.status(500).json({ error: 'レポートの取得に失敗しました' });
  }
});

// ============================================
// インサイト・推奨
// ============================================

router.get('/insights', async (_req: Request, res: Response) => {
  try {
    const insights = {
      opportunities: [
        {
          type: 'PRICING',
          title: '価格最適化の機会',
          description: '12件の出品が競合より高い価格設定になっています。価格を調整することで売上増加が期待できます。',
          potentialImpact: '+15% 売上増加',
          affectedListings: 12,
          action: '価格を見直す',
        },
        {
          type: 'INVENTORY',
          title: '人気商品の在庫補充',
          description: '5件のトップセラー商品の在庫が少なくなっています。',
          potentialImpact: '機会損失を防ぐ',
          affectedListings: 5,
          action: '在庫を補充',
        },
        {
          type: 'PROMOTION',
          title: 'プロモーションの活用',
          description: '今週末のセールイベントに参加してトラフィックを増やしましょう。',
          potentialImpact: '+20% トラフィック増加',
          action: 'イベントに参加',
        },
      ],
      warnings: [
        {
          type: 'PERFORMANCE',
          title: '遅延発送の増加',
          description: '過去7日間で遅延発送が増加しています。早めに対処してください。',
          severity: 'MEDIUM',
          action: '発送プロセスを見直す',
        },
      ],
      trends: [
        {
          category: 'Electronics',
          trend: 'UP',
          change: 18.5,
          insight: 'このカテゴリの需要が高まっています。在庫を増やすことを検討してください。',
        },
        {
          category: 'Clothing',
          trend: 'DOWN',
          change: -8.2,
          insight: 'シーズン終了に伴い需要が減少しています。セールを検討してください。',
        },
      ],
    };

    res.json(insights);
  } catch (error) {
    logger.error('Failed to get insights', error);
    res.status(500).json({ error: 'インサイトの取得に失敗しました' });
  }
});

// ============================================
// eBay API同期
// ============================================

router.post('/sync', async (_req: Request, res: Response) => {
  try {
    logger.info('Starting eBay Seller Hub sync');

    res.json({
      message: 'eBayセラーハブとの同期を開始しました',
      jobId: `sync-${Date.now()}`,
      status: 'PROCESSING',
    });
  } catch (error) {
    logger.error('Failed to sync with eBay Seller Hub', error);
    res.status(500).json({ error: '同期に失敗しました' });
  }
});

router.get('/sync/status', async (_req: Request, res: Response) => {
  try {
    res.json({
      lastSync: '2026-02-15T08:00:00Z',
      status: 'SUCCESS',
      nextScheduledSync: '2026-02-15T12:00:00Z',
      syncedData: {
        orders: 45,
        listings: 398,
        messages: 12,
        cases: 2,
      },
    });
  } catch (error) {
    logger.error('Failed to get sync status', error);
    res.status(500).json({ error: '同期ステータスの取得に失敗しました' });
  }
});

// ============================================
// 設定
// ============================================

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        alertTypes: {
          newOrder: true,
          lowInventory: true,
          performanceIssue: true,
          caseOpened: true,
          returnRequest: true,
        },
      },
      automation: {
        autoFeedback: true,
        autoMessage: false,
        autoRelist: true,
      },
      display: {
        defaultPeriod: '30d',
        currency: 'USD',
        timezone: 'Asia/Tokyo',
      },
      sync: {
        frequency: 'HOURLY',
        lastSync: '2026-02-15T08:00:00Z',
      },
    };

    res.json(settings);
  } catch (error) {
    logger.error('Failed to get settings', error);
    res.status(500).json({ error: '設定の取得に失敗しました' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;

    logger.info('Seller Hub settings updated');

    res.json({
      message: '設定を更新しました',
      settings,
    });
  } catch (error) {
    logger.error('Failed to update settings', error);
    res.status(500).json({ error: '設定の更新に失敗しました' });
  }
});

export { router as ebaySellerHubRouter };
