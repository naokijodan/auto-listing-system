import { Router, Request, Response } from 'express';

const router = Router();
const THEME = 'rose-600';

const ok = (req: Request, res: Response, extra: Record<string, unknown> = {}) =>
  res.json({ ok: true, path: req.path, method: req.method, theme: THEME, ...extra });

// Dashboard (5)
router.get('/dashboard', (req, res) => ok(req, res, { section: 'dashboard' }));
router.get('/dashboard/summary', (req, res) => ok(req, res, { section: 'dashboard-summary' }));
router.get('/dashboard/scores', (req, res) => ok(req, res, { section: 'dashboard-scores' }));
router.get('/dashboard/issues', (req, res) => ok(req, res, { section: 'dashboard-issues' }));
router.get('/dashboard/trends', (req, res) => ok(req, res, { section: 'dashboard-trends' }));

// Health checks (6): /checks (CRUD + run + fix)
router.get('/checks', (req, res) => ok(req, res, { section: 'checks-list' }));
router.post('/checks', (req, res) => ok(req, res, { section: 'checks-create' }));
router.put('/checks/:id', (req, res) => ok(req, res, { section: 'checks-update', id: req.params.id }));
router.delete('/checks/:id', (req, res) => ok(req, res, { section: 'checks-delete', id: req.params.id }));
router.post('/checks/:id/run', (req, res) => ok(req, res, { section: 'checks-run', id: req.params.id }));
router.post('/checks/:id/fix', (req, res) => ok(req, res, { section: 'checks-fix', id: req.params.id }));

// Issues (4)
router.get('/issues', (req, res) => ok(req, res, { section: 'issues-list' }));
router.get('/issues/:id', (req, res) => ok(req, res, { section: 'issues-detail', id: req.params.id }));
router.post('/issues/bulk-fix', (req, res) => ok(req, res, { section: 'issues-bulk-fix' }));
router.post('/issues/ignore', (req, res) => ok(req, res, { section: 'issues-ignore' }));

// Recommendations (4)
router.get('/recommendations', (req, res) => ok(req, res, { section: 'recommendations-list' }));
router.get('/recommendations/:id', (req, res) => ok(req, res, { section: 'recommendations-detail', id: req.params.id }));
router.post('/recommendations/apply', (req, res) => ok(req, res, { section: 'recommendations-apply' }));
router.post('/recommendations/dismiss', (req, res) => ok(req, res, { section: 'recommendations-dismiss' }));

// Analytics (3)
router.get('/analytics', (req, res) => ok(req, res, { section: 'analytics' }));
router.get('/analytics/improvement', (req, res) => ok(req, res, { section: 'analytics-improvement' }));
router.get('/analytics/comparison', (req, res) => ok(req, res, { section: 'analytics-comparison' }));

// Settings (2) GET/PUT
router.get('/settings', (req, res) => ok(req, res, { section: 'settings-get' }));
router.put('/settings', (req, res) => ok(req, res, { section: 'settings-put' }));

// Utilities (4)
router.get('/health', (req, res) => ok(req, res, { section: 'health' }));
router.get('/export', (req, res) => ok(req, res, { section: 'export' }));
router.post('/scan-all', (req, res) => ok(req, res, { section: 'scan-all' }));
router.post('/recalculate', (req, res) => ok(req, res, { section: 'recalculate' }));

export default router;

