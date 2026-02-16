import { Router, Request, Response } from 'express';

// Phase 320: Auto Responder (theme: teal-600)
// Mount this router at path: /api/ebay-auto-responder

const router = Router();

const ok = (res: Response, path: string, method: string, extra: Record<string, unknown> = {}) =>
  res.json({ service: 'ebay-auto-responder', theme: 'teal-600', path, method, ...extra });

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => ok(res, '/dashboard', 'GET'));
router.get('/dashboard/summary', (req: Request, res: Response) => ok(res, '/dashboard/summary', 'GET'));
router.get('/dashboard/stats', (req: Request, res: Response) => ok(res, '/dashboard/stats', 'GET'));
router.get('/dashboard/recent', (req: Request, res: Response) => ok(res, '/dashboard/recent', 'GET'));
router.get('/dashboard/performance', (req: Request, res: Response) => ok(res, '/dashboard/performance', 'GET'));

// Responses (6): CRUD + test + toggle
router.get('/responses', (req: Request, res: Response) => ok(res, '/responses', 'GET'));
router.post('/responses', (req: Request, res: Response) => ok(res, '/responses', 'POST', { body: req.body }));
router.put('/responses/:id', (req: Request, res: Response) => ok(res, `/responses/${req.params.id}`, 'PUT', { body: req.body }));
router.delete('/responses/:id', (req: Request, res: Response) => ok(res, `/responses/${req.params.id}`, 'DELETE'));
router.post('/responses/test', (req: Request, res: Response) => ok(res, '/responses/test', 'POST', { sample: req.body }));
router.post('/responses/:id/toggle', (req: Request, res: Response) => ok(res, `/responses/${req.params.id}/toggle`, 'POST'));

// Rules (4)
router.get('/rules', (req: Request, res: Response) => ok(res, '/rules', 'GET'));
router.get('/rules/:id', (req: Request, res: Response) => ok(res, `/rules/${req.params.id}`, 'GET'));
router.post('/rules/create', (req: Request, res: Response) => ok(res, '/rules/create', 'POST', { rule: req.body }));
router.put('/rules/priority', (req: Request, res: Response) => ok(res, '/rules/priority', 'PUT', { order: req.body }));

// Templates (4)
router.get('/templates', (req: Request, res: Response) => ok(res, '/templates', 'GET'));
router.get('/templates/:id', (req: Request, res: Response) => ok(res, `/templates/${req.params.id}`, 'GET'));
router.post('/templates/create', (req: Request, res: Response) => ok(res, '/templates/create', 'POST', { template: req.body }));
router.get('/templates/variables', (req: Request, res: Response) => ok(res, '/templates/variables', 'GET'));

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => ok(res, '/analytics', 'GET'));
router.get('/analytics/effectiveness', (req: Request, res: Response) => ok(res, '/analytics/effectiveness', 'GET'));
router.get('/analytics/timing', (req: Request, res: Response) => ok(res, '/analytics/timing', 'GET'));

// Settings (2)
router.get('/settings', (req: Request, res: Response) => ok(res, '/settings', 'GET'));
router.put('/settings', (req: Request, res: Response) => ok(res, '/settings', 'PUT', { settings: req.body }));

// Utilities (4)
router.get('/health', (req: Request, res: Response) => ok(res, '/health', 'GET', { status: 'ok' }));
router.post('/export', (req: Request, res: Response) => ok(res, '/export', 'POST', { format: req.body?.format ?? 'json' }));
router.post('/import', (req: Request, res: Response) => ok(res, '/import', 'POST', { stats: { imported: 0 } }));
router.post('/train', (req: Request, res: Response) => ok(res, '/train', 'POST'));

export default router;

