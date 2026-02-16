import { Router, Request, Response } from 'express';

const router = Router();

const theme = 'slate-600';

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
router.get('/dashboard/revenue', (req, res) => respond(req, res));
router.get('/dashboard/orders', (req, res) => respond(req, res));
router.get('/dashboard/products', (req, res) => respond(req, res));

// Reports (6): CRUD + generate + download
router.get('/reports', (req, res) => respond(req, res));
router.post('/reports', (req, res) => respond(req, res, { action: 'create' }));
router.put('/reports/:id', (req, res) => respond(req, res, { action: 'update', id: req.params.id }));
router.delete('/reports/:id', (req, res) => respond(req, res, { action: 'delete', id: req.params.id }));
router.post('/reports/generate', (req, res) => respond(req, res, { action: 'generate' }));
router.get('/reports/:id/download', (req, res) => respond(req, res, { action: 'download', id: req.params.id }));

// Templates (4)
router.get('/templates', (req, res) => respond(req, res));
router.get('/templates/:id', (req, res) => respond(req, res, { id: req.params.id }));
router.post('/templates/create', (req, res) => respond(req, res, { action: 'create' }));
router.post('/templates/preview', (req, res) => respond(req, res, { action: 'preview' }));

// Schedules (4)
router.get('/schedules', (req, res) => respond(req, res));
router.get('/schedules/:id', (req, res) => respond(req, res, { id: req.params.id }));
router.post('/schedules/create', (req, res) => respond(req, res, { action: 'create' }));
router.post('/schedules/toggle', (req, res) => respond(req, res, { action: 'toggle' }));

// Analytics (3)
router.get('/analytics', (req, res) => respond(req, res));
router.get('/analytics/trends', (req, res) => respond(req, res));
router.get('/analytics/comparison', (req, res) => respond(req, res));

// Settings (2)
router.get('/settings', (req, res) => respond(req, res));
router.put('/settings', (req, res) => respond(req, res, { action: 'update' }));

// Utilities (4)
router.get('/health', (req, res) => respond(req, res));
router.post('/export', (req, res) => respond(req, res, { action: 'export' }));
router.post('/import', (req, res) => respond(req, res, { action: 'import' }));
router.post('/recalculate', (req, res) => respond(req, res, { action: 'recalculate' }));

export default router;

