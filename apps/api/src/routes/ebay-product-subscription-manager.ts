import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// 商品サブスクリプション管理 - テーマカラー: violet-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activities', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activities' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// Subscriptions (6)
router.get('/subscriptions', (_req: Request, res: Response) => res.json({ section: 'subscriptions', action: 'list' }));
router.get('/subscriptions/:id', (_req: Request, res: Response) => res.json({ section: 'subscriptions', action: 'detail' }));
router.post('/subscriptions', (_req: Request, res: Response) => res.json({ section: 'subscriptions', action: 'create' }));
router.put('/subscriptions/:id', (_req: Request, res: Response) => res.json({ section: 'subscriptions', action: 'update' }));
router.post('/subscriptions/:id/pause', (_req: Request, res: Response) => res.json({ section: 'subscriptions', action: 'pause' }));
router.post('/subscriptions/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'subscriptions', action: 'cancel' }));

// Plans (4)
router.get('/plans', (_req: Request, res: Response) => res.json({ section: 'plans', action: 'list' }));
router.get('/plans/:id', (_req: Request, res: Response) => res.json({ section: 'plans', action: 'detail' }));
router.post('/plans', (_req: Request, res: Response) => res.json({ section: 'plans', action: 'create' }));
router.put('/plans/:id', (_req: Request, res: Response) => res.json({ section: 'plans', action: 'update' }));

// Billing (4)
router.get('/billing', (_req: Request, res: Response) => res.json({ section: 'billing', action: 'overview' }));
router.get('/billing/invoices', (_req: Request, res: Response) => res.json({ section: 'billing', action: 'invoices' }));
router.post('/billing/:id/pay', (_req: Request, res: Response) => res.json({ section: 'billing', action: 'pay' }));
router.get('/billing/:id/status', (_req: Request, res: Response) => res.json({ section: 'billing', action: 'status' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/retention', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'retention' }));
router.get('/analytics/revenue', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

