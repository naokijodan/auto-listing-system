import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 270: eBay Message Template Manager（メッセージテンプレート管理）
// 28エンドポイント - テーマカラー: cyan-600
// ============================================================

// スキーマ
const createTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['BUYER_INQUIRY', 'ORDER_STATUS', 'SHIPPING', 'FEEDBACK', 'RETURN', 'CUSTOM']),
  subject: z.string().min(1),
  body: z.string().min(1),
  language: z.string().default('en'),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// ダッシュボード
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalTemplates: 50,
    activeTemplates: 45,
    categoryCounts: { BUYER_INQUIRY: 15, ORDER_STATUS: 12, SHIPPING: 10, FEEDBACK: 8, RETURN: 5 },
    messagesSent: 5000,
    responseRate: 85,
  });
});

router.get('/dashboard/usage', async (req: Request, res: Response) => {
  res.json({
    usage: [
      { templateId: '1', name: 'Order Confirmation', usageCount: 500 },
      { templateId: '2', name: 'Shipping Update', usageCount: 450 },
    ],
  });
});

router.get('/dashboard/alerts', async (req: Request, res: Response) => {
  res.json({
    alerts: [
      { id: '1', type: 'low_response', template: 'Return Request', responseRate: 60 },
    ],
  });
});

// テンプレート管理
router.get('/templates', async (req: Request, res: Response) => {
  res.json({
    templates: [
      { id: '1', name: 'Order Confirmation', category: 'ORDER_STATUS', language: 'en', isActive: true },
      { id: '2', name: 'Shipping Notification', category: 'SHIPPING', language: 'en', isActive: true },
    ],
    total: 50,
  });
});

router.post('/templates', async (req: Request, res: Response) => {
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid template', details: parsed.error.issues });
  }
  res.status(201).json({
    id: `template_${Date.now()}`,
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });
});

router.get('/templates/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Order Confirmation',
    category: 'ORDER_STATUS',
    subject: 'Your order has been confirmed',
    body: 'Thank you for your order {{orderNumber}}. We will ship it soon.',
    variables: ['orderNumber', 'buyerName', 'itemTitle'],
    language: 'en',
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

router.post('/templates/:id/duplicate', async (req: Request, res: Response) => {
  res.status(201).json({
    id: `template_${Date.now()}`,
    name: 'Order Confirmation (Copy)',
    copiedFrom: req.params.id,
    createdAt: new Date().toISOString(),
  });
});

// プレビュー・テスト
router.post('/templates/:id/preview', async (req: Request, res: Response) => {
  res.json({
    subject: 'Your order #12345 has been confirmed',
    body: 'Thank you for your order #12345. We will ship it soon.',
    variables: req.body.variables || {},
  });
});

router.post('/templates/:id/test-send', async (req: Request, res: Response) => {
  res.json({
    success: true,
    sentTo: req.body.email || 'test@example.com',
    sentAt: new Date().toISOString(),
  });
});

// カテゴリ
router.get('/categories', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { id: 'BUYER_INQUIRY', name: 'Buyer Inquiry', count: 15 },
      { id: 'ORDER_STATUS', name: 'Order Status', count: 12 },
      { id: 'SHIPPING', name: 'Shipping', count: 10 },
      { id: 'FEEDBACK', name: 'Feedback', count: 8 },
      { id: 'RETURN', name: 'Return', count: 5 },
    ],
  });
});

router.get('/categories/:id/templates', async (req: Request, res: Response) => {
  res.json({
    category: req.params.id,
    templates: [
      { id: '1', name: 'Template 1', isActive: true },
    ],
    total: 10,
  });
});

// 変数管理
router.get('/variables', async (req: Request, res: Response) => {
  res.json({
    variables: [
      { name: 'buyerName', description: 'Buyer name', example: 'John Doe' },
      { name: 'orderNumber', description: 'Order number', example: '12345' },
      { name: 'itemTitle', description: 'Item title', example: 'Vintage Watch' },
      { name: 'trackingNumber', description: 'Tracking number', example: 'TRK123456' },
    ],
  });
});

router.get('/variables/custom', async (req: Request, res: Response) => {
  res.json({
    customVariables: [
      { name: 'storePolicy', value: 'We accept returns within 30 days' },
    ],
  });
});

router.post('/variables/custom', async (req: Request, res: Response) => {
  res.status(201).json({
    name: req.body.name,
    value: req.body.value,
    createdAt: new Date().toISOString(),
  });
});

// 多言語
router.get('/languages', async (req: Request, res: Response) => {
  res.json({
    languages: [
      { code: 'en', name: 'English', templateCount: 50 },
      { code: 'de', name: 'German', templateCount: 30 },
      { code: 'ja', name: 'Japanese', templateCount: 25 },
    ],
  });
});

router.post('/templates/:id/translate', async (req: Request, res: Response) => {
  res.status(201).json({
    originalId: req.params.id,
    translatedId: `template_${Date.now()}`,
    language: req.body.targetLanguage,
    status: 'COMPLETED',
  });
});

// 分析
router.get('/analytics/usage', async (req: Request, res: Response) => {
  res.json({
    totalSent: 5000,
    byCategory: { ORDER_STATUS: 2000, SHIPPING: 1500, BUYER_INQUIRY: 1000, FEEDBACK: 500 },
    byDay: [
      { date: '2026-02-15', count: 200 },
      { date: '2026-02-14', count: 180 },
    ],
  });
});

router.get('/analytics/response-rates', async (req: Request, res: Response) => {
  res.json({
    averageResponseRate: 85,
    byTemplate: [
      { templateId: '1', name: 'Order Confirmation', responseRate: 90 },
      { templateId: '2', name: 'Return Request', responseRate: 75 },
    ],
  });
});

// レポート
router.get('/reports/summary', async (req: Request, res: Response) => {
  res.json({
    totalTemplates: 50,
    messagesSent: 5000,
    averageResponseRate: 85,
    topTemplate: 'Order Confirmation',
  });
});

router.post('/reports/export', async (req: Request, res: Response) => {
  res.json({ jobId: `export_${Date.now()}`, status: 'STARTED' });
});

// 設定
router.get('/settings', async (req: Request, res: Response) => {
  res.json({
    defaultLanguage: 'en',
    autoTranslate: false,
    signatureEnabled: true,
    signature: 'Best regards, Your Store',
  });
});

router.put('/settings', async (req: Request, res: Response) => {
  res.json({ ...req.body, updatedAt: new Date().toISOString() });
});

export { router as ebayMessageTemplatesRouter };
