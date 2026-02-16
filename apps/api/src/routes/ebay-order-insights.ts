import { Router, Request, Response } from 'express';

const router = Router();
const ns = '/api/ebay-order-insights';

const ok = (res: Response, path: string, extra: Record<string, unknown> = {}) =>
  res.json({ ok: true, path: `${ns}${path}`, theme: 'indigo-600', ...extra, ts: new Date().toISOString() });

// ----- Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => ok(res, '/dashboard'));
router.get('/dashboard/summary', (_: Request, res: Response) => ok(res, '/dashboard/summary'));
router.get('/dashboard/trends', (_: Request, res: Response) => ok(res, '/dashboard/trends'));
router.get('/dashboard/kpis', (_: Request, res: Response) => ok(res, '/dashboard/kpis'));
router.get('/dashboard/alerts', (_: Request, res: Response) => ok(res, '/dashboard/alerts'));

// ----- Orders (6): list + detail + compare + segment + export + refresh
router.get('/orders', (_: Request, res: Response) => ok(res, '/orders'));
router.get('/orders/:id', (req: Request, res: Response) => ok(res, `/orders/${req.params.id}`));
router.post('/orders/compare', (req: Request, res: Response) => ok(res, '/orders/compare', { criteria: req.body ?? {} }));
router.post('/orders/segment', (req: Request, res: Response) => ok(res, '/orders/segment', { rules: req.body ?? {} }));
router.post('/orders/export', (req: Request, res: Response) => ok(res, '/orders/export', { format: req.body?.format ?? 'csv' }));
router.post('/orders/refresh', (_: Request, res: Response) => ok(res, '/orders/refresh'));

// ----- Patterns (4)
router.get('/patterns', (_: Request, res: Response) => ok(res, '/patterns'));
router.get('/patterns/:id', (req: Request, res: Response) => ok(res, `/patterns/${req.params.id}`));
router.post('/patterns/detect', (req: Request, res: Response) => ok(res, '/patterns/detect', { params: req.body ?? {} }));
router.post('/patterns/apply', (req: Request, res: Response) => ok(res, '/patterns/apply', { params: req.body ?? {} }));

// ----- Predictions (4)
router.get('/predictions', (_: Request, res: Response) => ok(res, '/predictions'));
router.get('/predictions/:id', (req: Request, res: Response) => ok(res, `/predictions/${req.params.id}`));
router.post('/predictions/generate', (req: Request, res: Response) => ok(res, '/predictions/generate', { params: req.body ?? {} }));
router.get('/predictions/accuracy', (_: Request, res: Response) => ok(res, '/predictions/accuracy'));

// ----- Analytics (3)
router.get('/analytics', (_: Request, res: Response) => ok(res, '/analytics'));
router.get('/analytics/revenue', (_: Request, res: Response) => ok(res, '/analytics/revenue'));
router.get('/analytics/customers', (_: Request, res: Response) => ok(res, '/analytics/customers'));

// ----- Settings (2): GET/PUT
router.get('/settings', (_: Request, res: Response) => ok(res, '/settings', { method: 'GET' }));
router.put('/settings', (req: Request, res: Response) => ok(res, '/settings', { method: 'PUT', settings: req.body ?? {} }));

// ----- Utilities (4)
router.get('/health', (_: Request, res: Response) => ok(res, '/health'));
router.post('/export', (req: Request, res: Response) => ok(res, '/export', { format: req.body?.format ?? 'json' }));
router.post('/import', (req: Request, res: Response) => ok(res, '/import', { imported: true }));
router.post('/recalculate', (_: Request, res: Response) => ok(res, '/recalculate'));

export default router;

