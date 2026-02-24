import { Router } from 'express'; import type { Request, Response } from 'express';

const router = Router();

// Phase 612: 注文カスタムラベラー — Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'root' }));
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/stats', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'stats' }));
router.get('/dashboard/recent-activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent-activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/pending', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'pending' }));
router.get('/orders/shipped', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'shipped' }));
router.get('/orders/canceled', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'canceled' }));
router.post('/orders/bulk-update', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'bulk-update' }));
router.get('/orders/invoices', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'invoices' }));

// Labels (4)
router.get('/labels', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'list' }));
router.post('/labels/generate', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'generate' }));
router.post('/labels/print', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'print' }));
router.get('/labels/history', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'history' }));

// Templates (4)
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.post('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));
router.delete('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'delete' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/fulfillment', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'fulfillment' }));
router.get('/analytics/sla', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sla' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

