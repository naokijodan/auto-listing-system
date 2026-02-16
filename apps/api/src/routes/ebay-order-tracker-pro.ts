import { Router, Request, Response } from 'express';

const router = Router();

const ok = (req: Request, res: Response, info: Record<string, unknown> = {}) => {
  res.json({ status: 'ok', path: req.path, method: req.method, ...info });
};

// Dashboard (5)
router.get('/dashboard', (req, res) => ok(req, res, { section: 'dashboard' }));
router.get('/dashboard/summary', (req, res) => ok(req, res, { section: 'dashboard', view: 'summary' }));
router.get('/dashboard/pending', (req, res) => ok(req, res, { section: 'dashboard', view: 'pending' }));
router.get('/dashboard/shipped', (req, res) => ok(req, res, { section: 'dashboard', view: 'shipped' }));
router.get('/dashboard/delivered', (req, res) => ok(req, res, { section: 'dashboard', view: 'delivered' }));

// Orders (6): list + detail + update + track + export + refresh
router.get('/orders', (req, res) => ok(req, res, { resource: 'orders', action: 'list' }));
router.get('/orders/:id', (req, res) => ok(req, res, { resource: 'orders', action: 'detail', id: req.params.id }));
router.put('/orders/:id', (req, res) => ok(req, res, { resource: 'orders', action: 'update', id: req.params.id, body: req.body }));
router.post('/orders/:id/track', (req, res) => ok(req, res, { resource: 'orders', action: 'track', id: req.params.id }));
router.get('/orders/export', (req, res) => ok(req, res, { resource: 'orders', action: 'export' }));
router.post('/orders/refresh', (req, res) => ok(req, res, { resource: 'orders', action: 'refresh' }));

// Shipments (4)
router.get('/shipments', (req, res) => ok(req, res, { resource: 'shipments', action: 'list' }));
router.get('/shipments/:id', (req, res) => ok(req, res, { resource: 'shipments', action: 'detail', id: req.params.id }));
router.put('/shipments/update', (req, res) => ok(req, res, { resource: 'shipments', action: 'update', body: req.body }));
router.post('/shipments/notify', (req, res) => ok(req, res, { resource: 'shipments', action: 'notify', body: req.body }));

// Alerts (4)
router.get('/alerts', (req, res) => ok(req, res, { resource: 'alerts', action: 'list' }));
router.get('/alerts/:id', (req, res) => ok(req, res, { resource: 'alerts', action: 'detail', id: req.params.id }));
router.post('/alerts/create', (req, res) => ok(req, res, { resource: 'alerts', action: 'create', body: req.body }));
router.post('/alerts/toggle', (req, res) => ok(req, res, { resource: 'alerts', action: 'toggle', body: req.body }));

// Analytics (3)
router.get('/analytics', (req, res) => ok(req, res, { resource: 'analytics', view: 'overview' }));
router.get('/analytics/delivery-time', (req, res) => ok(req, res, { resource: 'analytics', view: 'delivery-time' }));
router.get('/analytics/carriers', (req, res) => ok(req, res, { resource: 'analytics', view: 'carriers' }));

// Settings (2)
router.get('/settings', (req, res) => ok(req, res, { resource: 'settings', action: 'get' }));
router.put('/settings', (req, res) => ok(req, res, { resource: 'settings', action: 'update', body: req.body }));

// Utilities (4)
router.get('/health', (req, res) => ok(req, res, { util: 'health' }));
router.get('/export', (req, res) => ok(req, res, { util: 'export' }));
router.post('/import', (req, res) => ok(req, res, { util: 'import', body: req.body }));
router.post('/bulk-update', (req, res) => ok(req, res, { util: 'bulk-update', body: req.body }));

export default router;

