import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const h = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard', h('dashboard', 'dashboard'));
router.get('/dashboard/overview', h('dashboard', 'overview'));
router.get('/dashboard/metrics', h('dashboard', 'metrics'));
router.get('/dashboard/trends', h('dashboard', 'trends'));
router.get('/dashboard/alerts', h('dashboard', 'alerts'));

// inventory (6)
router.get('/inventory', h('inventory', 'list'));
router.get('/inventory/overview', h('inventory', 'overview'));
router.get('/inventory/detail', h('inventory', 'detail'));
router.get('/inventory/update', h('inventory', 'update'));
router.get('/inventory/rebalance', h('inventory', 'rebalance'));
router.get('/inventory/bulk', h('inventory', 'bulk'));

// locations (4)
router.get('/locations', h('locations', 'list'));
router.get('/locations/overview', h('locations', 'overview'));
router.get('/locations/assign', h('locations', 'assign'));
router.get('/locations/map', h('locations', 'map'));

// optimization (4)
router.get('/optimization', h('optimization', 'summary'));
router.get('/optimization/overview', h('optimization', 'overview'));
router.get('/optimization/run', h('optimization', 'run'));
router.get('/optimization/export', h('optimization', 'export'));

// analytics (3)
router.get('/analytics', h('analytics', 'analytics'));
router.get('/analytics/insights', h('analytics', 'insights'));
router.get('/analytics/trends', h('analytics', 'trends'));

// settings (2)
router.get('/settings', h('settings', 'settings'));
router.get('/settings/get', h('settings', 'get'));

// utilities (4)
router.get('/health', h('utilities', 'health'));
router.get('/status', h('utilities', 'status'));
router.get('/ping', h('utilities', 'ping'));
router.get('/info', h('utilities', 'info'));

export default router;

