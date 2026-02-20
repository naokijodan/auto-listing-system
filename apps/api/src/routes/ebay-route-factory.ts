import { Router, Request, Response } from 'express';

export interface EbayRouteConfig {
  theme: string; // テーマカラー（例: 'lime-600')
  resourceName: string; // メインCRUDのリソース名（例: 'exports')
  crudActions?: {
    action: string; // POST /:id/action
    detail: string; // GET /:id/detail
  };
}

export function createEbayRouter(config: EbayRouteConfig): Router {
  const router = Router();
  const { theme, resourceName, crudActions } = config;

  const actions = { action: 'start', detail: 'download', ...(crudActions ?? {}) };

  const ok = (
    req: Request,
    res: Response,
    extra: Record<string, unknown> = {}
  ) => res.json({ ok: true, path: req.path, method: req.method, theme, ...extra });

  // Dashboard (5)
  router.get('/dashboard', (req, res) => ok(req, res, { section: 'dashboard' }));
  router.get('/dashboard/summary', (req, res) => ok(req, res, { section: 'dashboard-summary' }));
  router.get('/dashboard/jobs', (req, res) => ok(req, res, { section: 'dashboard-jobs' }));
  router.get('/dashboard/history', (req, res) => ok(req, res, { section: 'dashboard-history' }));
  router.get('/dashboard/stats', (req, res) => ok(req, res, { section: 'dashboard-stats' }));

  // Main CRUD (6): /${resourceName}
  router.get(`/${resourceName}`, (req, res) => ok(req, res, { section: `${resourceName}-list` }));
  router.post(`/${resourceName}`, (req, res) => ok(req, res, { section: `${resourceName}-create` }));
  router.put(`/${resourceName}/:id`, (req, res) =>
    ok(req, res, { section: `${resourceName}-update`, id: req.params.id })
  );
  router.delete(`/${resourceName}/:id`, (req, res) =>
    ok(req, res, { section: `${resourceName}-delete`, id: req.params.id })
  );
  router.post(`/${resourceName}/:id/${actions.action}`, (req, res) =>
    ok(req, res, { section: `${resourceName}-${actions.action}`, id: req.params.id })
  );
  router.get(`/${resourceName}/:id/${actions.detail}`, (req, res) =>
    ok(req, res, { section: `${resourceName}-${actions.detail}`, id: req.params.id })
  );

  // Templates (4)
  router.get('/templates', (req, res) => ok(req, res, { section: 'templates-list' }));
  router.get('/templates/:id', (req, res) => ok(req, res, { section: 'templates-detail', id: req.params.id }));
  router.post('/templates/create', (req, res) => ok(req, res, { section: 'templates-create' }));
  router.post('/templates/preview', (req, res) => ok(req, res, { section: 'templates-preview' }));

  // Schedules (4)
  router.get('/schedules', (req, res) => ok(req, res, { section: 'schedules-list' }));
  router.get('/schedules/:id', (req, res) => ok(req, res, { section: 'schedules-detail', id: req.params.id }));
  router.post('/schedules/create', (req, res) => ok(req, res, { section: 'schedules-create' }));
  router.post('/schedules/toggle', (req, res) => ok(req, res, { section: 'schedules-toggle' }));

  // Analytics (3)
  router.get('/analytics', (req, res) => ok(req, res, { section: 'analytics' }));
  router.get('/analytics/usage', (req, res) => ok(req, res, { section: 'analytics-usage' }));
  router.get('/analytics/performance', (req, res) => ok(req, res, { section: 'analytics-performance' }));

  // Settings (2)
  router.get('/settings', (req, res) => ok(req, res, { section: 'settings-get' }));
  router.put('/settings', (req, res) => ok(req, res, { section: 'settings-put' }));

  // Utilities (4)
  router.get('/health', (req, res) => ok(req, res, { section: 'health' }));
  router.get('/formats', (req, res) => ok(req, res, { section: 'formats' }));
  router.get('/fields', (req, res) => ok(req, res, { section: 'fields' }));
  router.post('/validate', (req, res) => ok(req, res, { section: 'validate' }));

  return router;
}

