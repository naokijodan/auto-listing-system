import { Router, Request, Response } from 'express';

const router = Router();
const THEME = 'cyan-600';

// Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'dashboard', message: 'Sales velocity overview', ts: Date.now() });
});
router.get('/dashboard/summary', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'dashboard', metric: 'summary' });
});
router.get('/dashboard/avg-velocity', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'dashboard', metric: 'average_velocity' });
});
router.get('/dashboard/fast-moving', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'dashboard', metric: 'fast_moving_count' });
});
router.get('/dashboard/slow-moving', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'dashboard', metric: 'slow_moving_count' });
});

// Products (6): list, create, read, update, delete, duplicate
router.get('/products', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'products', action: 'list', items: [] });
});
router.post('/products', (req: Request, res: Response) => {
  res.status(201).json({ theme: THEME, section: 'products', action: 'create', data: req.body ?? {} });
});
router.get('/products/:id', (req: Request, res: Response) => {
  res.json({ theme: THEME, section: 'products', action: 'read', id: req.params.id });
});
router.put('/products/:id', (req: Request, res: Response) => {
  res.json({ theme: THEME, section: 'products', action: 'update', id: req.params.id, data: req.body ?? {} });
});
router.delete('/products/:id', (req: Request, res: Response) => {
  res.status(204).send();
});
router.post('/products/:id/duplicate', (req: Request, res: Response) => {
  res.status(201).json({ theme: THEME, section: 'products', action: 'duplicate', id: req.params.id });
});

// Velocity (4)
router.get('/velocity', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'velocity', view: 'overview' });
});
router.get('/velocity/:sku', (req: Request, res: Response) => {
  res.json({ theme: THEME, section: 'velocity', view: 'sku', sku: req.params.sku });
});
router.post('/velocity/compare', (req: Request, res: Response) => {
  res.json({ theme: THEME, section: 'velocity', view: 'compare', data: req.body ?? {} });
});
router.get('/velocity/forecast', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'velocity', view: 'forecast' });
});

// Ranking (4)
router.get('/ranking', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'ranking', view: 'overview' });
});
router.get('/ranking/top', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'ranking', view: 'top', items: [] });
});
router.get('/ranking/bottom', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'ranking', view: 'bottom', items: [] });
});
router.get('/ranking/changes', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'ranking', view: 'changes', items: [] });
});

// Analytics (3)
router.get('/analytics', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'analytics', view: 'overview' });
});
router.get('/analytics/trends', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'analytics', view: 'trends' });
});
router.get('/analytics/seasonality', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'analytics', view: 'seasonality' });
});

// Settings (2)
router.get('/settings', (_: Request, res: Response) => {
  res.json({ theme: THEME, section: 'settings', method: 'GET', data: { timezone: 'UTC' } });
});
router.put('/settings', (req: Request, res: Response) => {
  res.json({ theme: THEME, section: 'settings', method: 'PUT', data: req.body ?? {} });
});

// Utilities (4)
router.get('/health', (_: Request, res: Response) => {
  res.json({ status: 'ok', theme: THEME, service: 'sales-velocity-tracker', time: Date.now() });
});
router.post('/export', (_: Request, res: Response) => {
  res.json({ theme: THEME, action: 'export_started' });
});
router.post('/import', (_: Request, res: Response) => {
  res.status(202).json({ theme: THEME, action: 'import_received' });
});
router.post('/reindex', (_: Request, res: Response) => {
  res.json({ theme: THEME, action: 'reindex_started' });
});

export default router;

