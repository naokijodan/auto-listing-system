import { Router, Request, Response } from 'express';

const router = Router();
const theme = 'pink-600';

// Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard', theme });
});

router.get('/dashboard/summary', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard:summary', metrics: {}, theme });
});

router.get('/dashboard/connections', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard:connections', items: [], theme });
});

router.get('/dashboard/sync-status', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard:sync-status', status: 'idle', theme });
});

router.get('/dashboard/errors', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'dashboard:errors', errors: [], theme });
});

// Connections (6) - CRUD + test + sync
router.get('/connections', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'connections:list', items: [], theme });
});

router.post('/connections', (req: Request, res: Response) => {
  res.status(201).json({ ok: true, section: 'connections:create', data: req.body, theme });
});

router.put('/connections/:id', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'connections:update', id: req.params.id, data: req.body, theme });
});

router.delete('/connections/:id', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'connections:delete', id: req.params.id, theme });
});

router.post('/connections/:id/test', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'connections:test', id: req.params.id, result: 'success', theme });
});

router.post('/connections/:id/sync', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'connections:sync', id: req.params.id, started: true, theme });
});

// Mappings (4)
router.get('/mappings', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'mappings:list', items: [], theme });
});

router.get('/mappings/:id', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'mappings:detail', id: req.params.id, theme });
});

router.post('/mappings/create', (req: Request, res: Response) => {
  res.status(201).json({ ok: true, section: 'mappings:create', data: req.body, theme });
});

router.post('/mappings/auto', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'mappings:auto', params: req.body, theme });
});

// Rules (4)
router.get('/rules', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'rules:list', items: [], theme });
});

router.get('/rules/:id', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'rules:detail', id: req.params.id, theme });
});

router.post('/rules/create', (req: Request, res: Response) => {
  res.status(201).json({ ok: true, section: 'rules:create', data: req.body, theme });
});

router.post('/rules/priority', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'rules:priority', order: req.body, theme });
});

// Analytics (3)
router.get('/analytics', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'analytics:overview', theme });
});

router.get('/analytics/performance', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'analytics:performance', data: {}, theme });
});

router.get('/analytics/errors', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'analytics:errors', items: [], theme });
});

// Settings (2) GET/PUT
router.get('/settings', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'settings:get', settings: {}, theme });
});

router.put('/settings', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'settings:put', settings: req.body, theme });
});

// Utilities (4)
router.get('/health', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'health', status: 'healthy', theme });
});

router.post('/export', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'export', filter: req.body, theme });
});

router.post('/import', (req: Request, res: Response) => {
  res.json({ ok: true, section: 'import', imported: true, theme });
});

router.post('/force-sync', (_: Request, res: Response) => {
  res.json({ ok: true, section: 'force-sync', started: true, theme });
});

export default router;
