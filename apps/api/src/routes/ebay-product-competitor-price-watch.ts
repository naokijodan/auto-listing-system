import { Router } from 'express';
import type { Request, Response } from 'express';

// Phase 710: 商品競合価格ウォッチ (テーマカラー: violet-600)
const router = Router();

// dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'main' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/changes', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'changes' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/status', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'status' }));

// products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/track', (_req: Request, res: Response) => res.json({ section: 'products', action: 'track' }));
router.post('/products/untrack', (_req: Request, res: Response) => res.json({ section: 'products', action: 'untrack' }));
router.post('/products/compare', (_req: Request, res: Response) => res.json({ section: 'products', action: 'compare' }));
router.get('/products/history', (_req: Request, res: Response) => res.json({ section: 'products', action: 'history' }));

// competitors (4)
router.get('/competitors', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'list' }));
router.get('/competitors/:id', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'detail' }));
router.post('/competitors/monitor', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'monitor' }));
router.post('/competitors/compare', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'compare' }));

// alerts (4)
router.get('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'detail' }));
router.post('/alerts/create', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'create' }));
router.post('/alerts/toggle', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'toggle' }));

// analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'main' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));
router.get('/analytics/pricing', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'pricing' }));

// settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

