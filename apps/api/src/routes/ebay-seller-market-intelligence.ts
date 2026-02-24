import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));
router.get('/dashboard/insights', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'insights' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));

// Markets (6)
router.get('/markets/list', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'list' }));
router.get('/markets/detail', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'detail' }));
router.get('/markets/demand', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'demand' }));
router.get('/markets/supply', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'supply' }));
router.get('/markets/pricing', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'pricing' }));
router.get('/markets/opportunities', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'opportunities' }));

// Trends (4)
router.get('/trends/list', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'list' }));
router.get('/trends/detail', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'detail' }));
router.get('/trends/seasonality', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'seasonality' }));
router.get('/trends/forecast', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'forecast' }));

// Competitors (4)
router.get('/competitors/list', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'list' }));
router.get('/competitors/detail', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'detail' }));
router.get('/competitors/price-watch', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'price-watch' }));
router.get('/competitors/gap-analysis', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'gap-analysis' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
router.get('/analytics/insights', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'insights' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

