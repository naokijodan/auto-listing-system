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

// exports (6)
router.get('/exports', h('exports', 'list'));
router.get('/exports/overview', h('exports', 'overview'));
router.get('/exports/create', h('exports', 'create'));
router.get('/exports/history', h('exports', 'history'));
router.get('/exports/status', h('exports', 'status'));
router.get('/exports/bulk', h('exports', 'bulk'));

// templates (4)
router.get('/templates', h('templates', 'list'));
router.get('/templates/overview', h('templates', 'overview'));
router.get('/templates/create', h('templates', 'create'));
router.get('/templates/update', h('templates', 'update'));

// schedules (4)
router.get('/schedules', h('schedules', 'list'));
router.get('/schedules/overview', h('schedules', 'overview'));
router.get('/schedules/create', h('schedules', 'create'));
router.get('/schedules/update', h('schedules', 'update'));

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

