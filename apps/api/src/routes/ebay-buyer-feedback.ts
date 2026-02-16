import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 272: eBay Buyer Feedback Manager（バイヤーフィードバック管理）
// 28エンドポイント - テーマカラー: amber-600
// ============================================================

// スキーマ
const respondFeedbackSchema = z.object({
  responseText: z.string().min(1).max(500),
  isPrivate: z.boolean().default(false),
});

const requestFeedbackSchema = z.object({
  orderId: z.string(),
  buyerId: z.string(),
  templateId: z.string().optional(),
  message: z.string().optional(),
  scheduledAt: z.string().optional(),
});

// ========== ダッシュボード ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalFeedback: 2500,
    positiveFeedback: 2400,
    neutralFeedback: 80,
    negativeFeedback: 20,
    positivePercent: 96,
    avgRating: 4.8,
    pendingResponses: 15,
    recentTrend: 'improving',
  });
});

router.get('/dashboard/ratings', async (req: Request, res: Response) => {
  res.json({
    ratings: [
      { stars: 5, count: 2000, percent: 80 },
      { stars: 4, count: 400, percent: 16 },
      { stars: 3, count: 60, percent: 2.4 },
      { stars: 2, count: 25, percent: 1 },
      { stars: 1, count: 15, percent: 0.6 },
    ],
    avgRating: 4.8,
    trend: [
      { month: '2026-01', avgRating: 4.7, count: 400 },
      { month: '2026-02', avgRating: 4.8, count: 450 },
    ],
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'negative', message: '新しいネガティブフィードバックを受け取りました', severity: 'high', createdAt: new Date().toISOString() },
      { id: '2', type: 'pending', message: '15件の返信待ちフィードバックがあります', severity: 'medium' },
      { id: '3', type: 'milestone', message: 'ポジティブフィードバック率96%達成！', severity: 'info' },
    ],
  });
});

// ========== フィードバック一覧・詳細 ==========
router.get('/feedbacks', async (req: Request, res: Response) => {
  const { rating, responded, page = '1', limit = '20' } = req.query;
  res.json({
    feedbacks: [
      { id: '1', buyerId: 'buyer123', buyerName: 'John D.', rating: 5, type: 'positive', comment: 'Great item, fast shipping!', orderId: 'order1', itemTitle: 'Vintage Watch', responded: true, createdAt: '2026-02-15T10:00:00Z' },
      { id: '2', buyerId: 'buyer456', buyerName: 'Jane S.', rating: 4, type: 'positive', comment: 'Good condition, as described', orderId: 'order2', itemTitle: 'Camera Lens', responded: true, createdAt: '2026-02-14T15:30:00Z' },
      { id: '3', buyerId: 'buyer789', buyerName: 'Mike R.', rating: 2, type: 'negative', comment: 'Item arrived damaged', orderId: 'order3', itemTitle: 'Electronic Device', responded: false, createdAt: '2026-02-13T09:00:00Z' },
    ],
    total: 2500,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
  });
});

router.get('/feedbacks/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    buyerId: 'buyer123',
    buyerName: 'John D.',
    buyerHistory: { totalPurchases: 50, positiveLeft: 45, negativeLeft: 2 },
    rating: 5,
    type: 'positive',
    comment: 'Great item, fast shipping! Would buy from this seller again.',
    orderId: 'order123',
    itemId: 'item456',
    itemTitle: 'Vintage Seiko Watch',
    itemPrice: 150.00,
    orderDate: '2026-02-10T10:00:00Z',
    deliveryDate: '2026-02-14T15:00:00Z',
    responded: true,
    response: {
      text: 'Thank you for your purchase and kind feedback!',
      respondedAt: '2026-02-15T10:30:00Z',
    },
    createdAt: '2026-02-15T10:00:00Z',
  });
});

router.post('/feedbacks/:id/respond', async (req: Request, res: Response) => {
  const parsed = respondFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid response', details: parsed.error.issues });
  }
  res.json({
    id: req.params.id,
    response: {
      text: parsed.data.responseText,
      isPrivate: parsed.data.isPrivate,
      respondedAt: new Date().toISOString(),
    },
    success: true,
  });
});

router.post('/feedbacks/:id/flag', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    flagged: true,
    reason: req.body.reason || 'Policy violation',
    flaggedAt: new Date().toISOString(),
  });
});

// ========== フィードバックリクエスト ==========
router.get('/requests', async (req: Request, res: Response) => {
  res.json({
    requests: [
      { id: '1', orderId: 'order1', buyerId: 'buyer1', status: 'sent', sentAt: '2026-02-15T10:00:00Z', feedbackReceived: true },
      { id: '2', orderId: 'order2', buyerId: 'buyer2', status: 'pending', scheduledAt: '2026-02-17T09:00:00Z', feedbackReceived: false },
      { id: '3', orderId: 'order3', buyerId: 'buyer3', status: 'sent', sentAt: '2026-02-14T10:00:00Z', feedbackReceived: false },
    ],
    total: 100,
    successRate: 45,
  });
});

router.post('/requests', async (req: Request, res: Response) => {
  const parsed = requestFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `request_${Date.now()}`,
    ...parsed.data,
    status: parsed.data.scheduledAt ? 'scheduled' : 'sent',
    createdAt: new Date().toISOString(),
  });
});

router.post('/requests/bulk', async (req: Request, res: Response) => {
  const { orderIds, templateId, delay } = req.body;
  res.json({
    queued: orderIds?.length || 0,
    templateId,
    estimatedCompletion: new Date(Date.now() + (orderIds?.length || 0) * 60000).toISOString(),
  });
});

router.delete('/requests/:id', async (req: Request, res: Response) => {
  res.json({ success: true, cancelledId: req.params.id });
});

// ========== テンプレート管理 ==========
router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      { id: '1', name: 'Thank You - Standard', subject: 'Thank you for your purchase!', successRate: 50, usageCount: 500, isActive: true },
      { id: '2', name: 'Thank You - Personal', subject: 'A personal thank you', successRate: 55, usageCount: 300, isActive: true },
      { id: '3', name: 'Follow Up', subject: 'How was your experience?', successRate: 40, usageCount: 200, isActive: true },
    ],
    total: 5,
  });
});

router.post('/templates', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `template_${Date.now()}`,
    ...req.body,
    successRate: 0,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  });
});

router.get('/templates/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Thank You - Standard',
    subject: 'Thank you for your purchase of {{itemTitle}}!',
    body: 'Dear {{buyerName}},\n\nThank you for purchasing {{itemTitle}}.\n\nIf you\'re satisfied with your purchase, we\'d appreciate a positive feedback!\n\nBest regards,\n{{sellerName}}',
    variables: ['buyerName', 'itemTitle', 'sellerName', 'orderNumber'],
    successRate: 50,
    usageCount: 500,
    isActive: true,
  });
});

router.put('/templates/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

router.delete('/templates/:id', async (req: Request, res: Response) => {
  res.json({ success: true, deletedId: req.params.id });
});

// ========== 分析 ==========
router.get('/analytics/trends', async (req: Request, res: Response) => {
  res.json({
    trends: [
      { period: '2026-01-W1', positive: 95, neutral: 3, negative: 2, avgRating: 4.7 },
      { period: '2026-01-W2', positive: 96, neutral: 2, negative: 2, avgRating: 4.75 },
      { period: '2026-01-W3', positive: 96, neutral: 3, negative: 1, avgRating: 4.8 },
      { period: '2026-01-W4', positive: 97, neutral: 2, negative: 1, avgRating: 4.82 },
      { period: '2026-02-W1', positive: 96, neutral: 2, negative: 2, avgRating: 4.78 },
      { period: '2026-02-W2', positive: 97, neutral: 2, negative: 1, avgRating: 4.85 },
    ],
    overallTrend: 'improving',
    improvement: '+2%',
  });
});

router.get('/analytics/categories', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { category: 'Watches', feedbackCount: 800, avgRating: 4.9, positivePercent: 98 },
      { category: 'Electronics', feedbackCount: 600, avgRating: 4.7, positivePercent: 95 },
      { category: 'Collectibles', feedbackCount: 500, avgRating: 4.85, positivePercent: 97 },
      { category: 'Clothing', feedbackCount: 400, avgRating: 4.6, positivePercent: 93 },
    ],
    bestPerforming: 'Watches',
    needsAttention: 'Clothing',
  });
});

router.get('/analytics/issues', async (req: Request, res: Response) => {
  res.json({
    commonIssues: [
      { issue: 'Shipping delay', count: 15, percent: 40, trend: 'decreasing' },
      { issue: 'Item not as described', count: 10, percent: 27, trend: 'stable' },
      { issue: 'Damaged packaging', count: 8, percent: 22, trend: 'decreasing' },
      { issue: 'Communication issues', count: 4, percent: 11, trend: 'stable' },
    ],
    recommendations: [
      'Consider upgrading packaging materials',
      'Review shipping carrier performance',
    ],
  });
});

router.get('/analytics/response-impact', async (req: Request, res: Response) => {
  res.json({
    withResponse: { repeatPurchaseRate: 35, avgOrderValue: 120 },
    withoutResponse: { repeatPurchaseRate: 20, avgOrderValue: 95 },
    impact: {
      repeatPurchaseIncrease: '+75%',
      avgOrderValueIncrease: '+26%',
    },
    responseTimeStats: {
      avgResponseTime: 4.5,
      fastestResponse: 0.5,
      slowestResponse: 24,
      within24h: 92,
    },
  });
});

// ========== レポート ==========
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    period: req.query.period || 'last_30_days',
    totalFeedback: 450,
    positivePercent: 96,
    avgRating: 4.8,
    responseRate: 85,
    avgResponseTime: 4.5,
    topIssues: ['Shipping delay', 'Item condition'],
    achievements: ['Hit 96% positive rating', 'Reduced response time by 20%'],
  });
});

router.get('/reports/export', async (req: Request, res: Response) => {
  res.json({
    downloadUrl: '/api/ebay-buyer-feedback/reports/download/feedback_report_2026_02.csv',
    format: req.query.format || 'csv',
    generatedAt: new Date().toISOString(),
  });
});

// ========== 設定 ==========
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    autoRequestEnabled: true,
    requestDelayDays: 7,
    defaultTemplateId: 'template_1',
    autoRespondEnabled: false,
    negativeAlertEnabled: true,
    emailNotifications: true,
    slackNotifications: false,
    responseTimeGoal: 24,
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
});

export default router;
