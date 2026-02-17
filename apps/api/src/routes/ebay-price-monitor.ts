import { Router, Request, Response } from 'express';

// Phase 339: Price Monitor (テーマカラー: amber-600)
const router = Router();
const theme = 'amber-600';

// Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard', endpoint: '/dashboard', theme });
});
router.get('/dashboard/summary', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard', endpoint: '/dashboard/summary', theme });
});
router.get('/dashboard/changes', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard', endpoint: '/dashboard/changes', theme });
});
router.get('/dashboard/alerts', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard', endpoint: '/dashboard/alerts', theme });
});
router.get('/dashboard/trends', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard', endpoint: '/dashboard/trends', theme });
});

// Monitors (6): CRUD + start + stop
router.post('/monitors/create', (req: Request, res: Response) => {
  res.json({ ok: true, action: 'create', resource: 'monitor', body: req.body ?? null, theme });
});
router.get('/monitors/:id', (req: Request, res: Response) => {
  res.json({ ok: true, action: 'read', resource: 'monitor', id: req.params.id, theme });
});
router.put('/monitors/:id', (req: Request, res: Response) => {
  res.json({ ok: true, action: 'update', resource: 'monitor', id: req.params.id, body: req.body ?? null, theme });
});
router.delete('/monitors/:id', (req: Request, res: Response) => {
  res.json({ ok: true, action: 'delete', resource: 'monitor', id: req.params.id, theme });
});
router.post('/monitors/start', (req: Request, res: Response) => {
  res.json({ ok: true, action: 'start', resource: 'monitor', payload: req.body ?? null, theme });
});
router.post('/monitors/stop', (req: Request, res: Response) => {
  res.json({ ok: true, action: 'stop', resource: 'monitor', payload: req.body ?? null, theme });
});

// Rules (4)
router.get('/rules', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'rules', endpoint: '/rules', theme });
});
router.get('/rules/:id', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'rules', endpoint: '/rules/:id', id: req.params.id, theme });
});
router.post('/rules/create', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'rules', action: 'create', body: req.body ?? null, theme });
});
router.put('/rules/priority', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'rules', action: 'priority', body: req.body ?? null, theme });
});

// Alerts (4)
router.get('/alerts', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'alerts', endpoint: '/alerts', theme });
});
router.get('/alerts/:id', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'alerts', endpoint: '/alerts/:id', id: req.params.id, theme });
});
router.post('/alerts/create', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'alerts', action: 'create', body: req.body ?? null, theme });
});
router.post('/alerts/toggle', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'alerts', action: 'toggle', body: req.body ?? null, theme });
});

// Analytics (3)
router.get('/analytics', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'analytics', endpoint: '/analytics', theme });
});
router.get('/analytics/history', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'analytics', endpoint: '/analytics/history', theme });
});
router.get('/analytics/competitors', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'analytics', endpoint: '/analytics/competitors', theme });
});

// Settings (2) GET/PUT
router.get('/settings', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'settings', method: 'GET', theme });
});
router.put('/settings', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'settings', method: 'PUT', body: req.body ?? null, theme });
});

// Utilities (4)
router.get('/health', (_: Request, res: Response) => {
  res.json({ ok: true, util: 'health', theme });
});
router.post('/export', (req: Request, res: Response) => {
  res.json({ ok: true, util: 'export', body: req.body ?? null, theme });
});
router.post('/import', (req: Request, res: Response) => {
  res.json({ ok: true, util: 'import', body: req.body ?? null, theme });
});
router.post('/check-now', (req: Request, res: Response) => {
  res.json({ ok: true, util: 'check-now', body: req.body ?? null, theme });
});

export default router;

