import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/tracked', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'tracked' }));
router.get('/dashboard/price-drops', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'price-drops' }));
router.get('/dashboard/price-increases', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'price-increases' }));

// History (6)
router.get('/history', (_req: Request, res: Response) => res.json({ section: 'history', action: 'list' }));
router.get('/history/:id', (_req: Request, res: Response) => res.json({ section: 'history', action: 'detail' }));
router.post('/history/track', (_req: Request, res: Response) => res.json({ section: 'history', action: 'track' }));
router.post('/history/untrack', (_req: Request, res: Response) => res.json({ section: 'history', action: 'untrack' }));
router.post('/history/compare', (_req: Request, res: Response) => res.json({ section: 'history', action: 'compare' }));
router.get('/history/export', (_req: Request, res: Response) => res.json({ section: 'history', action: 'export' }));

// Products (4)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/:id/price-chart', (_req: Request, res: Response) => res.json({ section: 'products', action: 'price-chart' }));
router.get('/products/:id/alerts', (_req: Request, res: Response) => res.json({ section: 'products', action: 'alerts' }));

// Markets (4)
router.get('/markets', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'list' }));
router.get('/markets/:id', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'detail' }));
router.get('/markets/trends', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'trends' }));
router.get('/markets/benchmark', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'benchmark' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/price-volatility', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'price-volatility' }));
router.get('/analytics/market-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'market-trend' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

