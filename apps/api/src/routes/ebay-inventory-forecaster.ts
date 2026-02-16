import { Router, Request, Response } from 'express';

const router = Router();
const THEME = 'purple-600';

router.use((_, res, next) => {
  res.setHeader('X-Theme-Color', THEME);
  next();
});

const ok = (res: Response, path: string, extra: Record<string, unknown> = {}) =>
  res.json({ ok: true, theme: THEME, path, ...extra });

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => ok(res, '/dashboard'));
router.get('/dashboard/summary', (req: Request, res: Response) => ok(res, '/dashboard/summary'));
router.get('/dashboard/predictions', (req: Request, res: Response) => ok(res, '/dashboard/predictions'));
router.get('/dashboard/alerts', (req: Request, res: Response) => ok(res, '/dashboard/alerts'));
router.get('/dashboard/accuracy', (req: Request, res: Response) => ok(res, '/dashboard/accuracy'));

// Forecasts (6): CRUD + generate + compare
router.post('/forecasts', (req: Request, res: Response) => ok(res, '/forecasts', { action: 'create' }));
router.get('/forecasts/:id', (req: Request, res: Response) => ok(res, `/forecasts/${req.params.id}`, { action: 'read' }));
router.put('/forecasts/:id', (req: Request, res: Response) => ok(res, `/forecasts/${req.params.id}`, { action: 'update' }));
router.delete('/forecasts/:id', (req: Request, res: Response) => ok(res, `/forecasts/${req.params.id}`, { action: 'delete' }));
router.post('/forecasts/generate', (req: Request, res: Response) => ok(res, '/forecasts/generate', { action: 'generate' }));
router.post('/forecasts/compare', (req: Request, res: Response) => ok(res, '/forecasts/compare', { action: 'compare' }));

// Models (4)
router.get('/models', (req: Request, res: Response) => ok(res, '/models'));
router.get('/models/:id', (req: Request, res: Response) => ok(res, `/models/${req.params.id}`));
router.post('/models/train', (req: Request, res: Response) => ok(res, '/models/train'));
router.post('/models/evaluate', (req: Request, res: Response) => ok(res, '/models/evaluate'));

// Alerts (4)
router.get('/alerts', (req: Request, res: Response) => ok(res, '/alerts'));
router.get('/alerts/:id', (req: Request, res: Response) => ok(res, `/alerts/${req.params.id}`));
router.post('/alerts/create', (req: Request, res: Response) => ok(res, '/alerts/create'));
router.post('/alerts/toggle', (req: Request, res: Response) => ok(res, '/alerts/toggle'));

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => ok(res, '/analytics'));
router.get('/analytics/accuracy', (req: Request, res: Response) => ok(res, '/analytics/accuracy'));
router.get('/analytics/trends', (req: Request, res: Response) => ok(res, '/analytics/trends'));

// Settings (2)
router.get('/settings', (req: Request, res: Response) => ok(res, '/settings', { method: 'GET' }));
router.put('/settings', (req: Request, res: Response) => ok(res, '/settings', { method: 'PUT' }));

// Utilities (4)
router.get('/health', (req: Request, res: Response) => ok(res, '/health'));
router.post('/export', (req: Request, res: Response) => ok(res, '/export'));
router.post('/import', (req: Request, res: Response) => ok(res, '/import'));
router.post('/recalculate', (req: Request, res: Response) => ok(res, '/recalculate'));

export default router;

