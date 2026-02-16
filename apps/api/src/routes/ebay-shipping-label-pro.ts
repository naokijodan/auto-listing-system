import { Router } from 'express';

const router = Router();
const THEME_COLOR = 'cyan-600';

// Dashboard (5)
router.get('/dashboard', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard', method: 'GET', theme: THEME_COLOR });
});
router.get('/dashboard/summary', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/summary', method: 'GET' });
});
router.get('/dashboard/pending', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/pending', method: 'GET' });
});
router.get('/dashboard/printed', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/printed', method: 'GET' });
});
router.get('/dashboard/stats', (req, res) => {
  res.json({ ok: true, scope: 'dashboard', endpoint: '/dashboard/stats', method: 'GET' });
});

// Labels (6) - CRUD + print + void
router.post('/labels', (req, res) => {
  res.json({ ok: true, scope: 'labels', action: 'create', endpoint: '/labels', method: 'POST', body: req.body });
});
router.get('/labels/:id', (req, res) => {
  res.json({ ok: true, scope: 'labels', action: 'read', endpoint: '/labels/:id', method: 'GET', params: req.params });
});
router.put('/labels/:id', (req, res) => {
  res.json({ ok: true, scope: 'labels', action: 'update', endpoint: '/labels/:id', method: 'PUT', params: req.params, body: req.body });
});
router.delete('/labels/:id', (req, res) => {
  res.json({ ok: true, scope: 'labels', action: 'delete', endpoint: '/labels/:id', method: 'DELETE', params: req.params });
});
router.post('/labels/:id/print', (req, res) => {
  res.json({ ok: true, scope: 'labels', action: 'print', endpoint: '/labels/:id/print', method: 'POST', params: req.params });
});
router.post('/labels/:id/void', (req, res) => {
  res.json({ ok: true, scope: 'labels', action: 'void', endpoint: '/labels/:id/void', method: 'POST', params: req.params });
});

// Carriers (4)
router.get('/carriers', (req, res) => {
  res.json({ ok: true, scope: 'carriers', endpoint: '/carriers', method: 'GET' });
});
router.get('/carriers/:id', (req, res) => {
  res.json({ ok: true, scope: 'carriers', endpoint: '/carriers/:id', method: 'GET', params: req.params });
});
router.post('/carriers/rates', (req, res) => {
  res.json({ ok: true, scope: 'carriers', endpoint: '/carriers/rates', method: 'POST', body: req.body });
});
router.post('/carriers/connect', (req, res) => {
  res.json({ ok: true, scope: 'carriers', endpoint: '/carriers/connect', method: 'POST', body: req.body });
});

// Batches (4)
router.get('/batches', (req, res) => {
  res.json({ ok: true, scope: 'batches', endpoint: '/batches', method: 'GET' });
});
router.get('/batches/:id', (req, res) => {
  res.json({ ok: true, scope: 'batches', endpoint: '/batches/:id', method: 'GET', params: req.params });
});
router.post('/batches/create', (req, res) => {
  res.json({ ok: true, scope: 'batches', endpoint: '/batches/create', method: 'POST', body: req.body });
});
router.post('/batches/print', (req, res) => {
  res.json({ ok: true, scope: 'batches', endpoint: '/batches/print', method: 'POST', body: req.body });
});

// Analytics (3)
router.get('/analytics', (req, res) => {
  res.json({ ok: true, scope: 'analytics', endpoint: '/analytics', method: 'GET' });
});
router.get('/analytics/costs', (req, res) => {
  res.json({ ok: true, scope: 'analytics', endpoint: '/analytics/costs', method: 'GET' });
});
router.get('/analytics/carriers', (req, res) => {
  res.json({ ok: true, scope: 'analytics', endpoint: '/analytics/carriers', method: 'GET' });
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
router.post('/validate-address', (req, res) => {
  res.json({ ok: true, scope: 'utilities', endpoint: '/validate-address', method: 'POST', body: req.body });
});
router.get('/track', (req, res) => {
  res.json({ ok: true, scope: 'utilities', endpoint: '/track', method: 'GET', query: req.query });
});

export default router;

