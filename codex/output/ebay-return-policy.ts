import { Router, Request, Response } from 'express';

const router = Router();

// Theme color for reference
const theme = 'purple-600';

// ------------------------------
// Dashboard (5)
// ------------------------------
router.get('/dashboard', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'overview' });
});

router.get('/dashboard/summary', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'summary' });
});

router.get('/dashboard/policies', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'total_policies' });
});

router.get('/dashboard/applications', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'applied_products' });
});

router.get('/dashboard/returns', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'return_rate' });
});

// ------------------------------
// Policies (6) - CRUD + duplicate + assign
// ------------------------------
router.get('/policies', (_req: Request, res: Response) => {
  res.json({ section: 'policies', action: 'list' });
});

router.post('/policies', (req: Request, res: Response) => {
  res.json({ section: 'policies', action: 'create', body: req.body });
});

router.get('/policies/:id', (req: Request, res: Response) => {
  res.json({ section: 'policies', action: 'read', id: req.params.id });
});

router.put('/policies/:id', (req: Request, res: Response) => {
  res.json({ section: 'policies', action: 'update', id: req.params.id, body: req.body });
});

router.post('/policies/:id/duplicate', (req: Request, res: Response) => {
  res.json({ section: 'policies', action: 'duplicate', id: req.params.id });
});

router.post('/policies/:id/assign', (req: Request, res: Response) => {
  res.json({ section: 'policies', action: 'assign', id: req.params.id, body: req.body });
});

// ------------------------------
// Conditions (4)
// ------------------------------
router.get('/conditions', (_req: Request, res: Response) => {
  res.json({ section: 'conditions', action: 'list' });
});

router.get('/conditions/:id', (req: Request, res: Response) => {
  res.json({ section: 'conditions', action: 'read', id: req.params.id });
});

router.post('/conditions/create', (req: Request, res: Response) => {
  res.json({ section: 'conditions', action: 'create', body: req.body });
});

router.put('/conditions/update', (req: Request, res: Response) => {
  res.json({ section: 'conditions', action: 'update', body: req.body });
});

// ------------------------------
// Assignments (4)
// ------------------------------
router.get('/assignments', (_req: Request, res: Response) => {
  res.json({ section: 'assignments', action: 'list' });
});

router.get('/assignments/:id', (req: Request, res: Response) => {
  res.json({ section: 'assignments', action: 'read', id: req.params.id });
});

router.post('/assignments/bulk', (req: Request, res: Response) => {
  res.json({ section: 'assignments', action: 'bulk', body: req.body });
});

router.post('/assignments/preview', (req: Request, res: Response) => {
  res.json({ section: 'assignments', action: 'preview', body: req.body });
});

// ------------------------------
// Analytics (3)
// ------------------------------
router.get('/analytics', (_req: Request, res: Response) => {
  res.json({ section: 'analytics', metric: 'overview' });
});

router.get('/analytics/returns', (_req: Request, res: Response) => {
  res.json({ section: 'analytics', metric: 'returns' });
});

router.get('/analytics/impact', (_req: Request, res: Response) => {
  res.json({ section: 'analytics', metric: 'impact' });
});

// ------------------------------
// Settings (2)
// ------------------------------
router.get('/settings', (_req: Request, res: Response) => {
  res.json({ section: 'settings', action: 'get' });
});

router.put('/settings', (req: Request, res: Response) => {
  res.json({ section: 'settings', action: 'update', body: req.body });
});

// ------------------------------
// Utilities (4)
// ------------------------------
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', theme });
});

router.post('/export', (req: Request, res: Response) => {
  res.json({ action: 'export', options: req.body || null });
});

router.post('/import', (req: Request, res: Response) => {
  res.json({ action: 'import', payload: req.body || null });
});

router.post('/reindex', (_req: Request, res: Response) => {
  res.json({ action: 'reindex', status: 'started' });
});

export default router;

