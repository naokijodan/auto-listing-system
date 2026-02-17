import { Router, Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard' }));
router.get('/dashboard/summary', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/summary' }));
router.get('/dashboard/revenue', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/revenue' }));
router.get('/dashboard/costs', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/costs' }));
router.get('/dashboard/profit', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/profit' }));

// Metrics (6): list + detail + compare + trend + export + refresh
router.get('/metrics', (_: Request, res: Response) => res.json({ section: 'metrics', action: 'list' }));
router.get('/metrics/:id', (req: Request, res: Response) => res.json({ section: 'metrics', action: 'detail', id: req.params.id }));
router.post('/metrics/compare', (req: Request, res: Response) => res.json({ section: 'metrics', action: 'compare', body: req.body }));
router.get('/metrics/trend', (_: Request, res: Response) => res.json({ section: 'metrics', action: 'trend' }));
router.post('/metrics/export', (_: Request, res: Response) => res.json({ section: 'metrics', action: 'export', status: 'queued' }));
router.post('/metrics/refresh', (_: Request, res: Response) => res.json({ section: 'metrics', action: 'refresh', status: 'started' }));

// Goals (4)
router.get('/goals', (_: Request, res: Response) => res.json({ section: 'goals', action: 'list' }));
router.get('/goals/:id', (req: Request, res: Response) => res.json({ section: 'goals', action: 'detail', id: req.params.id }));
router.post('/goals/create', (req: Request, res: Response) => res.json({ section: 'goals', action: 'create', body: req.body }));
router.get('/goals/progress', (_: Request, res: Response) => res.json({ section: 'goals', action: 'progress' }));

// Forecasts (4)
router.get('/forecasts', (_: Request, res: Response) => res.json({ section: 'forecasts', action: 'list' }));
router.get('/forecasts/:id', (req: Request, res: Response) => res.json({ section: 'forecasts', action: 'detail', id: req.params.id }));
router.post('/forecasts/generate', (req: Request, res: Response) => res.json({ section: 'forecasts', action: 'generate', body: req.body }));
router.post('/forecasts/compare', (req: Request, res: Response) => res.json({ section: 'forecasts', action: 'compare', body: req.body }));

// Analytics (3)
router.get('/analytics', (_: Request, res: Response) => res.json({ section: 'analytics', path: '/analytics' }));
router.get('/analytics/breakdown', (_: Request, res: Response) => res.json({ section: 'analytics', path: '/analytics/breakdown' }));
router.get('/analytics/trends', (_: Request, res: Response) => res.json({ section: 'analytics', path: '/analytics/trends' }));

// Settings (2)
router.get('/settings', (_: Request, res: Response) => res.json({ section: 'settings', method: 'GET' }));
router.put('/settings', (req: Request, res: Response) => res.json({ section: 'settings', method: 'PUT', body: req.body }));

// Utilities (4)
router.get('/health', (_: Request, res: Response) => res.json({ status: 'ok', service: 'ebay-revenue-dashboard' }));
router.post('/export', (_: Request, res: Response) => res.json({ action: 'export', status: 'queued' }));
router.post('/import', (req: Request, res: Response) => res.json({ action: 'import', received: !!req.body }));
router.post('/recalculate', (_: Request, res: Response) => res.json({ action: 'recalculate', status: 'started' }));

export default router;

