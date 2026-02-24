import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const stub = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', stub('dashboard', 'overview'));
router.get('/dashboard/stats', stub('dashboard', 'stats'));
router.get('/dashboard/alerts', stub('dashboard', 'alerts'));
router.get('/dashboard/schedule', stub('dashboard', 'schedule'));
router.get('/dashboard/health', stub('dashboard', 'health'));

// kits (6)
router.get('/kits/summary', stub('kits', 'summary'));
router.get('/kits/create', stub('kits', 'create'));
router.get('/kits/update', stub('kits', 'update'));
router.get('/kits/delete', stub('kits', 'delete'));
router.get('/kits/bulk', stub('kits', 'bulk'));
router.get('/kits/versions', stub('kits', 'versions'));

// components (4)
router.get('/components/summary', stub('components', 'summary'));
router.get('/components/add', stub('components', 'add'));
router.get('/components/remove', stub('components', 'remove'));
router.get('/components/reconcile', stub('components', 'reconcile'));

// assembly (4)
router.get('/assembly/summary', stub('assembly', 'summary'));
router.get('/assembly/start', stub('assembly', 'start'));
router.get('/assembly/pause', stub('assembly', 'pause'));
router.get('/assembly/complete', stub('assembly', 'complete'));

// analytics (3)
router.get('/analytics/overview', stub('analytics', 'overview'));
router.get('/analytics/performance', stub('analytics', 'performance'));
router.get('/analytics/trends', stub('analytics', 'trends'));

// settings (2)
router.get('/settings/get', stub('settings', 'get'));
router.get('/settings/update', stub('settings', 'update'));

// utilities (4)
router.get('/utilities/ping', stub('utilities', 'ping'));
router.get('/utilities/status', stub('utilities', 'status'));
router.get('/utilities/export', stub('utilities', 'export'));
router.get('/utilities/import', stub('utilities', 'import'));

export default router;
