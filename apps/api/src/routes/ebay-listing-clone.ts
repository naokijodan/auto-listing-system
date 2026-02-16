import { Router, Request, Response } from 'express';

const router = Router();
const ns = '/api/ebay-listing-clone';

const ok = (res: Response, path: string, extra: Record<string, unknown> = {}) =>
  res.json({ ok: true, path: `${ns}${path}`, theme: 'amber-600', ...extra, ts: new Date().toISOString() });

// ----- Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => ok(res, '/dashboard'));
router.get('/dashboard/summary', (_: Request, res: Response) => ok(res, '/dashboard/summary'));
router.get('/dashboard/recent', (_: Request, res: Response) => ok(res, '/dashboard/recent'));
router.get('/dashboard/stats', (_: Request, res: Response) => ok(res, '/dashboard/stats'));
router.get('/dashboard/errors', (_: Request, res: Response) => ok(res, '/dashboard/errors'));

// ----- Clones (6): CRUD + execute + preview
router.post('/clones', (req: Request, res: Response) => ok(res, '/clones', { action: 'create', data: req.body ?? {} }));
router.get('/clones/:id', (req: Request, res: Response) => ok(res, `/clones/${req.params.id}`, { action: 'read' }));
router.put('/clones/:id', (req: Request, res: Response) => ok(res, `/clones/${req.params.id}`, { action: 'update', data: req.body ?? {} }));
router.delete('/clones/:id', (req: Request, res: Response) => ok(res, `/clones/${req.params.id}`, { action: 'delete' }));
router.post('/clones/:id/execute', (req: Request, res: Response) => ok(res, `/clones/${req.params.id}/execute`, { options: req.body ?? {} }));
router.get('/clones/:id/preview', (req: Request, res: Response) => ok(res, `/clones/${req.params.id}/preview`));

// ----- Templates (4)
router.get('/templates', (_: Request, res: Response) => ok(res, '/templates'));
router.get('/templates/:id', (req: Request, res: Response) => ok(res, `/templates/${req.params.id}`));
router.post('/templates/create', (req: Request, res: Response) => ok(res, '/templates/create', { template: req.body ?? {} }));
router.post('/templates/apply', (req: Request, res: Response) => ok(res, '/templates/apply', { params: req.body ?? {} }));

// ----- Bulk (4)
router.get('/bulk', (_: Request, res: Response) => ok(res, '/bulk'));
router.get('/bulk/:id', (req: Request, res: Response) => ok(res, `/bulk/${req.params.id}`));
router.post('/bulk/start', (req: Request, res: Response) => ok(res, '/bulk/start', { options: req.body ?? {} }));
router.get('/bulk/status', (_: Request, res: Response) => ok(res, '/bulk/status'));

// ----- Analytics (3)
router.get('/analytics', (_: Request, res: Response) => ok(res, '/analytics'));
router.get('/analytics/usage', (_: Request, res: Response) => ok(res, '/analytics/usage'));
router.get('/analytics/performance', (_: Request, res: Response) => ok(res, '/analytics/performance'));

// ----- Settings (2): GET/PUT
router.get('/settings', (_: Request, res: Response) => ok(res, '/settings', { method: 'GET' }));
router.put('/settings', (req: Request, res: Response) => ok(res, '/settings', { method: 'PUT', settings: req.body ?? {} }));

// ----- Utilities (4)
router.get('/health', (_: Request, res: Response) => ok(res, '/health'));
router.post('/export', (req: Request, res: Response) => ok(res, '/export', { format: req.body?.format ?? 'json' }));
router.post('/validate', (req: Request, res: Response) => ok(res, '/validate', { params: req.body ?? {} }));
router.post('/diff', (req: Request, res: Response) => ok(res, '/diff', { params: req.body ?? {} }));

export default router;

