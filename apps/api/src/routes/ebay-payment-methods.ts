import { Router, Request, Response } from 'express';

const router = Router();

const ok = (res: Response, route: string, extra: Record<string, unknown> = {}) =>
  res.json({ status: 'ok', route, ...extra });

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => ok(res, '/dashboard', {
  metrics: { methods: 4, transactions: 1284, totalFees: 342.8 },
}));
router.get('/dashboard/summary', (req: Request, res: Response) => ok(res, '/dashboard/summary', {
  totals: { methods: 4, transactions: 1284, totalFees: 342.8 },
}));
router.get('/dashboard/transactions', (req: Request, res: Response) => ok(res, '/dashboard/transactions', {
  recent: [{ id: 't1', amount: 42.5 }, { id: 't2', amount: 99.0 }],
}));
router.get('/dashboard/fees', (req: Request, res: Response) => ok(res, '/dashboard/fees', {
  feeRate: 0.029,
}));
router.get('/dashboard/disputes', (req: Request, res: Response) => ok(res, '/dashboard/disputes', {
  open: 2,
}));

// Methods (6)
router.get('/methods', (req: Request, res: Response) => ok(res, '/methods', {
  items: [{ id: 'm1', type: 'card' }, { id: 'm2', type: 'paypal' }],
}));
router.post('/methods', (req: Request, res: Response) => ok(res, '/methods', {
  created: req.body ?? {},
}));
router.get('/methods/:id', (req: Request, res: Response) => ok(res, '/methods/:id', {
  id: req.params.id,
}));
router.put('/methods/:id', (req: Request, res: Response) => ok(res, '/methods/:id', {
  id: req.params.id,
  updated: req.body ?? {},
}));
router.post('/methods/:id/activate', (req: Request, res: Response) => ok(res, '/methods/:id/activate', {
  id: req.params.id,
  active: true,
}));
router.post('/methods/:id/deactivate', (req: Request, res: Response) => ok(res, '/methods/:id/deactivate', {
  id: req.params.id,
  active: false,
}));

// Transactions (4)
router.get('/transactions', (req: Request, res: Response) => ok(res, '/transactions', {
  items: [{ id: 't1', amount: 42.5 }, { id: 't2', amount: 99.0 }],
}));
router.get('/transactions/:id', (req: Request, res: Response) => ok(res, '/transactions/:id', {
  id: req.params.id,
}));
router.post('/transactions/refund', (req: Request, res: Response) => ok(res, '/transactions/refund', {
  request: req.body ?? {},
  refunded: true,
}));
router.post('/transactions/void', (req: Request, res: Response) => ok(res, '/transactions/void', {
  request: req.body ?? {},
  voided: true,
}));

// Fees (4)
router.get('/fees', (req: Request, res: Response) => ok(res, '/fees', {
  items: [{ id: 'f1', amount: 1.2 }],
}));
router.get('/fees/:id', (req: Request, res: Response) => ok(res, '/fees/:id', {
  id: req.params.id,
}));
router.post('/fees/calculate', (req: Request, res: Response) => ok(res, '/fees/calculate', {
  request: req.body ?? {},
  result: { fee: 1.23, currency: 'USD' },
}));
router.get('/fees/summary', (req: Request, res: Response) => ok(res, '/fees/summary', {
  totals: { monthly: 98.2 },
}));

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => ok(res, '/analytics', {
  overview: { revenue: 12455.22, disputes: 3 },
}));
router.get('/analytics/revenue', (req: Request, res: Response) => ok(res, '/analytics/revenue', {
  series: [{ day: '2026-02-14', amount: 522.1 }],
}));
router.get('/analytics/disputes', (req: Request, res: Response) => ok(res, '/analytics/disputes', {
  items: [{ id: 'd1', status: 'open' }],
}));

// Settings (2)
router.get('/settings', (req: Request, res: Response) => ok(res, '/settings', {
  settings: { defaultMethod: 'card', capture: 'auto' },
}));
router.put('/settings', (req: Request, res: Response) => ok(res, '/settings', {
  saved: req.body ?? {},
}));

// Utilities (4)
router.get('/health', (req: Request, res: Response) => ok(res, '/health', { healthy: true }));
router.post('/export', (req: Request, res: Response) => ok(res, '/export', { jobId: 'exp_456' }));
router.post('/import', (req: Request, res: Response) => ok(res, '/import', { jobId: 'imp_456' }));
router.post('/reindex', (req: Request, res: Response) => ok(res, '/reindex', { started: true }));

export default router;

