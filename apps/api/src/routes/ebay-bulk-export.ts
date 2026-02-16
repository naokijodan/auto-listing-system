import { Router, Request, Response } from 'express';

const router = Router();
const THEME = 'lime-600';

// Helper to standardize responses
const ok = (req: Request, res: Response, extra: Record<string, unknown> = {}) =>
  res.json({ ok: true, path: req.path, method: req.method, theme: THEME, ...extra });

// Dashboard (5)
router.get('/dashboard', (req, res) => ok(req, res, { section: 'dashboard' }));
router.get('/dashboard/summary', (req, res) => ok(req, res, { section: 'dashboard-summary' }));
router.get('/dashboard/jobs', (req, res) => ok(req, res, { section: 'dashboard-jobs' }));
router.get('/dashboard/history', (req, res) => ok(req, res, { section: 'dashboard-history' }));
router.get('/dashboard/stats', (req, res) => ok(req, res, { section: 'dashboard-stats' }));

// Exports (6): /exports (CRUD + start + download)
router.get('/exports', (req, res) => ok(req, res, { section: 'exports-list' }));
router.post('/exports', (req, res) => ok(req, res, { section: 'exports-create' }));
router.put('/exports/:id', (req, res) => ok(req, res, { section: 'exports-update', id: req.params.id }));
router.delete('/exports/:id', (req, res) => ok(req, res, { section: 'exports-delete', id: req.params.id }));
router.post('/exports/:id/start', (req, res) => ok(req, res, { section: 'exports-start', id: req.params.id }));
router.get('/exports/:id/download', (req, res) => ok(req, res, { section: 'exports-download', id: req.params.id }));

// Templates (4)
router.get('/templates', (req, res) => ok(req, res, { section: 'templates-list' }));
router.get('/templates/:id', (req, res) => ok(req, res, { section: 'templates-detail', id: req.params.id }));
router.post('/templates/create', (req, res) => ok(req, res, { section: 'templates-create' }));
router.post('/templates/preview', (req, res) => ok(req, res, { section: 'templates-preview' }));

// Schedules (4)
router.get('/schedules', (req, res) => ok(req, res, { section: 'schedules-list' }));
router.get('/schedules/:id', (req, res) => ok(req, res, { section: 'schedules-detail', id: req.params.id }));
router.post('/schedules/create', (req, res) => ok(req, res, { section: 'schedules-create' }));
router.post('/schedules/toggle', (req, res) => ok(req, res, { section: 'schedules-toggle' }));

// Analytics (3)
router.get('/analytics', (req, res) => ok(req, res, { section: 'analytics' }));
router.get('/analytics/usage', (req, res) => ok(req, res, { section: 'analytics-usage' }));
router.get('/analytics/performance', (req, res) => ok(req, res, { section: 'analytics-performance' }));

// Settings (2) GET/PUT
router.get('/settings', (req, res) => ok(req, res, { section: 'settings-get' }));
router.put('/settings', (req, res) => ok(req, res, { section: 'settings-put' }));

// Utilities (4)
router.get('/health', (req, res) => ok(req, res, { section: 'health' }));
router.get('/formats', (req, res) => ok(req, res, { section: 'formats' }));
router.get('/fields', (req, res) => ok(req, res, { section: 'fields' }));
router.post('/validate', (req, res) => ok(req, res, { section: 'validate' }));

export default router;

