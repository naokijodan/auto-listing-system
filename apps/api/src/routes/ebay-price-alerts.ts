import { Router, Request, Response } from 'express';

const router = Router();
const scope = 'ebay-price-alerts';
const themeColor = 'sky-600';

function respond(req: Request, res: Response, extra: Record<string, unknown> = {}) {
  res.json({
    status: 'ok',
    scope,
    themeColor,
    path: req.path,
    method: req.method,
    ...extra,
  });
}

// Dashboard (5)
router.get('/dashboard', (req, res) => respond(req, res, { section: 'dashboard' }));
router.get('/dashboard/summary', (req, res) => respond(req, res, { section: 'dashboard:summary' }));
router.get('/dashboard/active-alerts', (req, res) => respond(req, res, { section: 'dashboard:active-alerts' }));
router.get('/dashboard/triggered', (req, res) => respond(req, res, { section: 'dashboard:triggered' }));
router.get('/dashboard/trends', (req, res) => respond(req, res, { section: 'dashboard:trends' }));

// Alerts (6): CRUD + enable + test
router.get('/alerts', (req, res) => respond(req, res, { section: 'alerts:list' }));
router.post('/alerts', (req, res) => respond(req, res, { section: 'alerts:create' }));
router.put('/alerts/:id', (req, res) => respond(req, res, { section: 'alerts:update', id: req.params.id }));
router.delete('/alerts/:id', (req, res) => respond(req, res, { section: 'alerts:delete', id: req.params.id }));
router.post('/alerts/:id/enable', (req, res) => respond(req, res, { section: 'alerts:enable', id: req.params.id }));
router.post('/alerts/:id/test', (req, res) => respond(req, res, { section: 'alerts:test', id: req.params.id }));

// Rules (4)
router.get('/rules', (req, res) => respond(req, res, { section: 'rules:list' }));
router.get('/rules/:id', (req, res) => respond(req, res, { section: 'rules:detail', id: req.params.id }));
router.post('/rules/create', (req, res) => respond(req, res, { section: 'rules:create' }));
router.put('/rules/priority', (req, res) => respond(req, res, { section: 'rules:priority' }));

// Notifications (4)
router.get('/notifications', (req, res) => respond(req, res, { section: 'notifications:list' }));
router.get('/notifications/:id', (req, res) => respond(req, res, { section: 'notifications:detail', id: req.params.id }));
router.post('/notifications/send', (req, res) => respond(req, res, { section: 'notifications:send' }));
router.get('/notifications/channels', (req, res) => respond(req, res, { section: 'notifications:channels' }));

// Analytics (3)
router.get('/analytics', (req, res) => respond(req, res, { section: 'analytics:overview' }));
router.get('/analytics/effectiveness', (req, res) => respond(req, res, { section: 'analytics:effectiveness' }));
router.get('/analytics/products', (req, res) => respond(req, res, { section: 'analytics:products' }));

// Settings (2)
router.get('/settings', (req, res) => respond(req, res, { section: 'settings:get' }));
router.put('/settings', (req, res) => respond(req, res, { section: 'settings:update' }));

// Utilities (4)
router.get('/health', (req, res) => respond(req, res, { section: 'util:health' }));
router.post('/export', (req, res) => respond(req, res, { section: 'util:export' }));
router.post('/import', (req, res) => respond(req, res, { section: 'util:import' }));
router.post('/check-prices', (req, res) => respond(req, res, { section: 'util:check-prices' }));

export default router;

