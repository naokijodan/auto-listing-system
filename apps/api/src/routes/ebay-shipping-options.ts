import { Router, Request, Response } from 'express';

const router = Router();

// Helpers
const ok = (res: Response, route: string, extra: Record<string, unknown> = {}) =>
  res.json({ status: 'ok', route, ...extra });

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => ok(res, '/dashboard', {
  metrics: { options: 12, carriers: 5, avgDays: 3.4 },
}));
router.get('/dashboard/summary', (req: Request, res: Response) => ok(res, '/dashboard/summary', {
  totals: { options: 12, carriers: 5, avgDays: 3.4 },
}));
router.get('/dashboard/carriers', (req: Request, res: Response) => ok(res, '/dashboard/carriers', {
  carriers: [{ id: 'c1', name: 'UPS' }, { id: 'c2', name: 'FedEx' }],
}));
router.get('/dashboard/rates', (req: Request, res: Response) => ok(res, '/dashboard/rates', {
  rateBuckets: [{ zone: 'US', avg: 8.5 }, { zone: 'EU', avg: 12.2 }],
}));
router.get('/dashboard/performance', (req: Request, res: Response) => ok(res, '/dashboard/performance', {
  onTimeRate: 0.97,
}));

// Options (6) - CRUD + duplicate + apply
router.get('/options', (req: Request, res: Response) => ok(res, '/options', {
  items: [{ id: 'o1', name: 'Standard' }, { id: 'o2', name: 'Express' }],
}));
router.post('/options', (req: Request, res: Response) => ok(res, '/options', {
  created: req.body ?? {},
}));
router.get('/options/:id', (req: Request, res: Response) => ok(res, '/options/:id', {
  id: req.params.id,
}));
router.put('/options/:id', (req: Request, res: Response) => ok(res, '/options/:id', {
  id: req.params.id,
  updated: req.body ?? {},
}));
router.post('/options/:id/duplicate', (req: Request, res: Response) => ok(res, '/options/:id/duplicate', {
  id: req.params.id,
  duplicatedId: `${req.params.id}-copy`,
}));
router.post('/options/:id/apply', (req: Request, res: Response) => ok(res, '/options/:id/apply', {
  id: req.params.id,
  appliedTo: req.body?.target ?? 'all',
}));

// Carriers (4)
router.get('/carriers', (req: Request, res: Response) => ok(res, '/carriers', {
  carriers: [{ id: 'c1', name: 'UPS' }, { id: 'c2', name: 'FedEx' }],
}));
router.get('/carriers/:id', (req: Request, res: Response) => ok(res, '/carriers/:id', {
  id: req.params.id,
}));
router.post('/carriers/create', (req: Request, res: Response) => ok(res, '/carriers/create', {
  created: req.body ?? {},
}));
router.put('/carriers/update', (req: Request, res: Response) => ok(res, '/carriers/update', {
  updated: req.body ?? {},
}));

// Rates (4)
router.get('/rates', (req: Request, res: Response) => ok(res, '/rates', {
  rates: [{ id: 'r1', service: 'Standard', price: 8.5 }],
}));
router.get('/rates/:id', (req: Request, res: Response) => ok(res, '/rates/:id', {
  id: req.params.id,
}));
router.post('/rates/calculate', (req: Request, res: Response) => ok(res, '/rates/calculate', {
  request: req.body ?? {},
  result: { price: 10.25, currency: 'USD' },
}));
router.put('/rates/bulk-update', (req: Request, res: Response) => ok(res, '/rates/bulk-update', {
  updatedCount: Array.isArray(req.body) ? req.body.length : 0,
}));

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => ok(res, '/analytics', {
  overview: { cost: 1245.33, avgDays: 3.4 },
}));
router.get('/analytics/costs', (req: Request, res: Response) => ok(res, '/analytics/costs', {
  monthly: [{ month: '2026-01', cost: 412.2 }],
}));
router.get('/analytics/delivery-times', (req: Request, res: Response) => ok(res, '/analytics/delivery-times', {
  percentiles: { p50: 3, p90: 5 },
}));

// Settings (2)
router.get('/settings', (req: Request, res: Response) => ok(res, '/settings', {
  settings: { defaultCarrier: 'UPS', fallbackDays: 5 },
}));
router.put('/settings', (req: Request, res: Response) => ok(res, '/settings', {
  saved: req.body ?? {},
}));

// Utilities (4)
router.get('/health', (req: Request, res: Response) => ok(res, '/health', { healthy: true }));
router.post('/export', (req: Request, res: Response) => ok(res, '/export', { jobId: 'exp_123' }));
router.post('/import', (req: Request, res: Response) => ok(res, '/import', { jobId: 'imp_123' }));
router.post('/reindex', (req: Request, res: Response) => ok(res, '/reindex', { started: true }));

export default router;

