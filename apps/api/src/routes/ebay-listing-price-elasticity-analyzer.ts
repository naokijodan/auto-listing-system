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

// listings (6)
router.get('/listings', h('listings', 'list'));
router.get('/listings/overview', h('listings', 'overview'));
router.get('/listings/detail', h('listings', 'detail'));
router.get('/listings/create', h('listings', 'create'));
router.get('/listings/update', h('listings', 'update'));
router.get('/listings/bulk', h('listings', 'bulk'));

// analysis (4)
router.get('/analysis', h('analysis', 'analysis'));
router.get('/analysis/overview', h('analysis', 'overview'));
router.get('/analysis/run', h('analysis', 'run'));
router.get('/analysis/export', h('analysis', 'export'));

// simulations (4)
router.get('/simulations', h('simulations', 'list'));
router.get('/simulations/overview', h('simulations', 'overview'));
router.get('/simulations/run', h('simulations', 'run'));
router.get('/simulations/scenarios', h('simulations', 'scenarios'));

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

