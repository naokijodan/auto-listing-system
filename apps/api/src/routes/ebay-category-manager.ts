import { Router } from 'express';

const router = Router();
const THEME_COLOR = 'orange-600';

// Dashboard (5)
router.get('/dashboard', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard', method: 'GET', theme: THEME_COLOR });
});
router.get('/dashboard/summary', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/summary', method: 'GET' });
});
router.get('/dashboard/tree', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/tree', method: 'GET' });
});
router.get('/dashboard/stats', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/stats', method: 'GET' });
});
router.get('/dashboard/changes', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/changes', method: 'GET' });
});

// Categories (6) - list + detail + search + map + suggest + sync
router.get('/categories', (req, res) => {
  res.json({ ok: true, scope: 'categories', endpoint: '/categories', method: 'GET' });
});
router.get('/categories/:id', (req, res) => {
  res.json({ ok: true, scope: 'categories', endpoint: '/categories/:id', method: 'GET', params: req.params });
});
router.get('/categories/search', (req, res) => {
  res.json({ ok: true, scope: 'categories', endpoint: '/categories/search', method: 'GET', query: req.query });
});
router.post('/categories/map', (req, res) => {
  res.json({ ok: true, scope: 'categories', endpoint: '/categories/map', method: 'POST', body: req.body });
});
router.get('/categories/suggest', (req, res) => {
  res.json({ ok: true, scope: 'categories', endpoint: '/categories/suggest', method: 'GET', query: req.query });
});
router.post('/categories/sync', (req, res) => {
  res.json({ ok: true, scope: 'categories', endpoint: '/categories/sync', method: 'POST', body: req.body });
});

// Mappings (4)
router.get('/mappings', (req, res) => {
  res.json({ ok: true, scope: 'mappings', endpoint: '/mappings', method: 'GET' });
});
router.get('/mappings/:id', (req, res) => {
  res.json({ ok: true, scope: 'mappings', endpoint: '/mappings/:id', method: 'GET', params: req.params });
});
router.post('/mappings/create', (req, res) => {
  res.json({ ok: true, scope: 'mappings', endpoint: '/mappings/create', method: 'POST', body: req.body });
});
router.post('/mappings/bulk', (req, res) => {
  res.json({ ok: true, scope: 'mappings', endpoint: '/mappings/bulk', method: 'POST', body: req.body });
});

// Rules (4)
router.get('/rules', (req, res) => {
  res.json({ ok: true, scope: 'rules', endpoint: '/rules', method: 'GET' });
});
router.get('/rules/:id', (req, res) => {
  res.json({ ok: true, scope: 'rules', endpoint: '/rules/:id', method: 'GET', params: req.params });
});
router.post('/rules/create', (req, res) => {
  res.json({ ok: true, scope: 'rules', endpoint: '/rules/create', method: 'POST', body: req.body });
});
router.post('/rules/test', (req, res) => {
  res.json({ ok: true, scope: 'rules', endpoint: '/rules/test', method: 'POST', body: req.body });
});

// Analytics (3)
router.get('/analytics', (req, res) => {
  res.json({ ok: true, scope: 'analytics', endpoint: '/analytics', method: 'GET' });
});
router.get('/analytics/distribution', (req, res) => {
  res.json({ ok: true, scope: 'analytics', endpoint: '/analytics/distribution', method: 'GET' });
});
router.get('/analytics/performance', (req, res) => {
  res.json({ ok: true, scope: 'analytics', endpoint: '/analytics/performance', method: 'GET' });
});

// Settings (2)
router.get('/settings', (req, res) => {
  res.json({ ok: true, scope: 'settings', endpoint: '/settings', method: 'GET' });
});
router.put('/settings', (req, res) => {
  res.json({ ok: true, scope: 'settings', endpoint: '/settings', method: 'PUT', body: req.body });
});

// Utilities (4)
router.get('/health', (req, res) => {
  res.json({ ok: true, scope: 'utilities', endpoint: '/health', method: 'GET', status: 'healthy' });
});
router.get('/export', (req, res) => {
  res.json({ ok: true, scope: 'utilities', endpoint: '/export', method: 'GET' });
});
router.post('/import', (req, res) => {
  res.json({ ok: true, scope: 'utilities', endpoint: '/import', method: 'POST', body: req.body });
});
router.post('/refresh', (req, res) => {
  res.json({ ok: true, scope: 'utilities', endpoint: '/refresh', method: 'POST' });
});

export default router;

