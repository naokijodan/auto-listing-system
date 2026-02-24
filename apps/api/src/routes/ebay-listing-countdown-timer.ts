import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Helper to generate simple stub handlers
const stub = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', stub('dashboard', 'overview'));
router.get('/dashboard/stats', stub('dashboard', 'stats'));
router.get('/dashboard/alerts', stub('dashboard', 'alerts'));
router.get('/dashboard/schedule', stub('dashboard', 'schedule'));
router.get('/dashboard/health', stub('dashboard', 'health'));

// listings (6)
router.get('/listings/summary', stub('listings', 'summary'));
router.get('/listings/create', stub('listings', 'create'));
router.get('/listings/update', stub('listings', 'update'));
router.get('/listings/delete', stub('listings', 'delete'));
router.get('/listings/schedule', stub('listings', 'schedule'));
router.get('/listings/bulk', stub('listings', 'bulk'));

// timers (4)
router.get('/timers/summary', stub('timers', 'summary'));
router.get('/timers/start', stub('timers', 'start'));
router.get('/timers/pause', stub('timers', 'pause'));
router.get('/timers/reset', stub('timers', 'reset'));

// campaigns (4)
router.get('/campaigns/summary', stub('campaigns', 'summary'));
router.get('/campaigns/create', stub('campaigns', 'create'));
router.get('/campaigns/schedule', stub('campaigns', 'schedule'));
router.get('/campaigns/archive', stub('campaigns', 'archive'));

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

