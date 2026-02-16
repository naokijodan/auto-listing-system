import { Router, Request, Response } from 'express';

const router = Router();

// helper responder
const ok = (req: Request, res: Response, info: Record<string, unknown> = {}) => {
  res.json({ status: 'ok', path: req.path, method: req.method, ...info });
};

// Dashboard (5)
router.get('/dashboard', (req, res) => ok(req, res, { section: 'dashboard' }));
router.get('/dashboard/summary', (req, res) => ok(req, res, { section: 'dashboard', view: 'summary' }));
router.get('/dashboard/opportunities', (req, res) => ok(req, res, { section: 'dashboard', view: 'opportunities' }));
router.get('/dashboard/changes', (req, res) => ok(req, res, { section: 'dashboard', view: 'changes' }));
router.get('/dashboard/impact', (req, res) => ok(req, res, { section: 'dashboard', view: 'impact' }));

// Pricing (6): CRUD + apply + simulate
router.get('/pricing', (req, res) => ok(req, res, { resource: 'pricing', action: 'list' }));
router.post('/pricing', (req, res) => ok(req, res, { resource: 'pricing', action: 'create', body: req.body }));
router.put('/pricing', (req, res) => ok(req, res, { resource: 'pricing', action: 'update', body: req.body }));
router.delete('/pricing', (req, res) => ok(req, res, { resource: 'pricing', action: 'delete' }));
router.post('/pricing/apply', (req, res) => ok(req, res, { resource: 'pricing', action: 'apply', body: req.body }));
router.post('/pricing/simulate', (req, res) => ok(req, res, { resource: 'pricing', action: 'simulate', body: req.body }));

// Rules (4)
router.get('/rules', (req, res) => ok(req, res, { resource: 'rules', action: 'list' }));
router.get('/rules/:id', (req, res) => ok(req, res, { resource: 'rules', action: 'detail', id: req.params.id }));
router.post('/rules/create', (req, res) => ok(req, res, { resource: 'rules', action: 'create', body: req.body }));
router.post('/rules/priority', (req, res) => ok(req, res, { resource: 'rules', action: 'priority', body: req.body }));

// Competitors (4)
router.get('/competitors', (req, res) => ok(req, res, { resource: 'competitors', action: 'list' }));
router.get('/competitors/:id', (req, res) => ok(req, res, { resource: 'competitors', action: 'detail', id: req.params.id }));
router.post('/competitors/track', (req, res) => ok(req, res, { resource: 'competitors', action: 'track', body: req.body }));
router.post('/competitors/compare', (req, res) => ok(req, res, { resource: 'competitors', action: 'compare', body: req.body }));

// Analytics (3)
router.get('/analytics', (req, res) => ok(req, res, { resource: 'analytics', view: 'overview' }));
router.get('/analytics/elasticity', (req, res) => ok(req, res, { resource: 'analytics', view: 'elasticity' }));
router.get('/analytics/revenue', (req, res) => ok(req, res, { resource: 'analytics', view: 'revenue' }));

// Settings (2) GET/PUT
router.get('/settings', (req, res) => ok(req, res, { resource: 'settings', action: 'get' }));
router.put('/settings', (req, res) => ok(req, res, { resource: 'settings', action: 'update', body: req.body }));

// Utilities (4)
router.get('/health', (req, res) => ok(req, res, { util: 'health' }));
router.get('/export', (req, res) => ok(req, res, { util: 'export' }));
router.post('/import', (req, res) => ok(req, res, { util: 'import', body: req.body }));
router.post('/recalculate', (req, res) => ok(req, res, { util: 'recalculate', body: req.body }));

export default router;

