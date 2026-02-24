import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-fit', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-fit' }));
router.get('/dashboard/poor-fit', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'poor-fit' }));
router.get('/dashboard/opportunities', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'opportunities' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/analyze', (_req: Request, res: Response) => res.json({ section: 'products', action: 'analyze' }));
router.post('/products/score', (_req: Request, res: Response) => res.json({ section: 'products', action: 'score' }));
router.post('/products/compare', (_req: Request, res: Response) => res.json({ section: 'products', action: 'compare' }));
router.get('/products/history', (_req: Request, res: Response) => res.json({ section: 'products', action: 'history' }));

// Markets (4)
router.get('/markets', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'list' }));
router.get('/markets/:id', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'detail' }));
router.post('/markets/research', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'research' }));
router.get('/markets/trends', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'trends' }));

// Reports (4)
router.get('/reports', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'list' }));
router.get('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'detail' }));
router.post('/reports/generate', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'generate' }));
router.post('/reports/schedule', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'schedule' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/fit-score-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'fit-score-trend' }));
router.get('/analytics/market-gap', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'market-gap' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

