import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/insights', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'insights' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/opportunities', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'opportunities' }));

// Insights (6)
router.get('/insights', (_req: Request, res: Response) => res.json({ section: 'insights', action: 'list' }));
router.get('/insights/detail', (_req: Request, res: Response) => res.json({ section: 'insights', action: 'detail' }));
router.get('/insights/generate', (_req: Request, res: Response) => res.json({ section: 'insights', action: 'generate' }));
router.get('/insights/refresh', (_req: Request, res: Response) => res.json({ section: 'insights', action: 'refresh' }));
router.get('/insights/bulk-generate', (_req: Request, res: Response) => res.json({ section: 'insights', action: 'bulk-generate' }));
router.get('/insights/history', (_req: Request, res: Response) => res.json({ section: 'insights', action: 'history' }));

// Competitors (4)
router.get('/competitors', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'list' }));
router.get('/competitors/detail', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'detail' }));
router.get('/competitors/track', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'track' }));
router.get('/competitors/compare', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'compare' }));

// Strategies (4)
router.get('/strategies', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'list' }));
router.get('/strategies/detail', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'detail' }));
router.get('/strategies/create', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'create' }));
router.get('/strategies/update', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/price-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'price-trend' }));
router.get('/analytics/market-position', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'market-position' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.get('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

