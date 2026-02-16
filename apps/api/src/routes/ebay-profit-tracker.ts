import { Router, Request, Response } from 'express';

const router = Router();

const theme = 'emerald-600';

function respond(req: Request, res: Response, extra: Record<string, unknown> = {}) {
  res.json({
    ok: true,
    theme,
    path: req.path,
    method: req.method,
    ...extra,
    timestamp: new Date().toISOString(),
  });
}

// Dashboard (5)
router.get('/dashboard', (req, res) => respond(req, res));
router.get('/dashboard/summary', (req, res) => respond(req, res));
router.get('/dashboard/margins', (req, res) => respond(req, res));
router.get('/dashboard/costs', (req, res) => respond(req, res));
router.get('/dashboard/trends', (req, res) => respond(req, res));

// Profits (6): list + detail + calculate + compare + export + refresh
router.get('/profits', (req, res) => respond(req, res));
router.get('/profits/:id', (req, res) => respond(req, res, { id: req.params.id }));
router.post('/profits/calculate', (req, res) => respond(req, res, { action: 'calculate' }));
router.post('/profits/compare', (req, res) => respond(req, res, { action: 'compare' }));
router.get('/profits/export', (req, res) => respond(req, res, { action: 'export' }));
router.post('/profits/refresh', (req, res) => respond(req, res, { action: 'refresh' }));

// Costs (4)
router.get('/costs', (req, res) => respond(req, res));
router.get('/costs/:id', (req, res) => respond(req, res, { id: req.params.id }));
router.post('/costs/create', (req, res) => respond(req, res, { action: 'create' }));
router.get('/costs/categories', (req, res) => respond(req, res));

// Goals (4)
router.get('/goals', (req, res) => respond(req, res));
router.get('/goals/:id', (req, res) => respond(req, res, { id: req.params.id }));
router.post('/goals/create', (req, res) => respond(req, res, { action: 'create' }));
router.get('/goals/progress', (req, res) => respond(req, res));

// Analytics (3)
router.get('/analytics', (req, res) => respond(req, res));
router.get('/analytics/breakdown', (req, res) => respond(req, res));
router.get('/analytics/products', (req, res) => respond(req, res));

// Settings (2)
router.get('/settings', (req, res) => respond(req, res));
router.put('/settings', (req, res) => respond(req, res, { action: 'update' }));

// Utilities (4)
router.get('/health', (req, res) => respond(req, res));
router.post('/export', (req, res) => respond(req, res, { action: 'export' }));
router.post('/import', (req, res) => respond(req, res, { action: 'import' }));
router.post('/recalculate', (req, res) => respond(req, res, { action: 'recalculate' }));

export default router;

