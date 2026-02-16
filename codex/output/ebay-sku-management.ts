import { Router, Request, Response } from 'express';

const router = Router();

// Theme color for reference
const theme = 'slate-600';

// ------------------------------
// Dashboard (5)
// ------------------------------
router.get('/dashboard', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'overview' });
});

router.get('/dashboard/summary', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'summary' });
});

router.get('/dashboard/active', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'active' });
});

router.get('/dashboard/inactive', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'inactive' });
});

router.get('/dashboard/duplicates', (_req: Request, res: Response) => {
  res.json({ section: 'dashboard', theme, metric: 'duplicates' });
});

// ------------------------------
// SKU Management (6) - CRUD + merge + split
// ------------------------------
router.get('/skus', (_req: Request, res: Response) => {
  res.json({ section: 'skus', action: 'list' });
});

router.post('/skus', (req: Request, res: Response) => {
  res.json({ section: 'skus', action: 'create', body: req.body });
});

router.get('/skus/:id', (req: Request, res: Response) => {
  res.json({ section: 'skus', action: 'read', id: req.params.id });
});

router.put('/skus/:id', (req: Request, res: Response) => {
  res.json({ section: 'skus', action: 'update', id: req.params.id, body: req.body });
});

router.post('/skus/:id/merge', (req: Request, res: Response) => {
  res.json({ section: 'skus', action: 'merge', id: req.params.id, body: req.body });
});

router.post('/skus/:id/split', (req: Request, res: Response) => {
  res.json({ section: 'skus', action: 'split', id: req.params.id, body: req.body });
});

// ------------------------------
// Mappings (4)
// ------------------------------
router.get('/mappings', (_req: Request, res: Response) => {
  res.json({ section: 'mappings', action: 'list' });
});

router.get('/mappings/:id', (req: Request, res: Response) => {
  res.json({ section: 'mappings', action: 'read', id: req.params.id });
});

router.post('/mappings/create', (req: Request, res: Response) => {
  res.json({ section: 'mappings', action: 'create', body: req.body });
});

router.post('/mappings/sync', (req: Request, res: Response) => {
  res.json({ section: 'mappings', action: 'sync', body: req.body });
});

// ------------------------------
// Validation (4)
// ------------------------------
router.get('/validation', (_req: Request, res: Response) => {
  res.json({ section: 'validation', action: 'overview' });
});

router.post('/validation/run', (req: Request, res: Response) => {
  res.json({ section: 'validation', action: 'run', body: req.body });
});

router.get('/validation/issues', (_req: Request, res: Response) => {
  res.json({ section: 'validation', action: 'issues' });
});

router.post('/validation/fix', (req: Request, res: Response) => {
  res.json({ section: 'validation', action: 'fix', body: req.body });
});

// ------------------------------
// Analytics (3)
// ------------------------------
router.get('/analytics', (_req: Request, res: Response) => {
  res.json({ section: 'analytics', metric: 'overview' });
});

router.get('/analytics/usage', (_req: Request, res: Response) => {
  res.json({ section: 'analytics', metric: 'usage' });
});

router.get('/analytics/duplicates', (_req: Request, res: Response) => {
  res.json({ section: 'analytics', metric: 'duplicates' });
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

