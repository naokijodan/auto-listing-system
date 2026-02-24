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

// seasons (6)
router.get('/seasons/summary', stub('seasons', 'summary'));
router.get('/seasons/create', stub('seasons', 'create'));
router.get('/seasons/update', stub('seasons', 'update'));
router.get('/seasons/archive', stub('seasons', 'archive'));
router.get('/seasons/calendar', stub('seasons', 'calendar'));
router.get('/seasons/bulk', stub('seasons', 'bulk'));

// campaigns (4)
router.get('/campaigns/summary', stub('campaigns', 'summary'));
router.get('/campaigns/create', stub('campaigns', 'create'));
router.get('/campaigns/schedule', stub('campaigns', 'schedule'));
router.get('/campaigns/archive', stub('campaigns', 'archive'));

// forecasts (4)
router.get('/forecasts/summary', stub('forecasts', 'summary'));
router.get('/forecasts/generate', stub('forecasts', 'generate'));
router.get('/forecasts/adjust', stub('forecasts', 'adjust'));
router.get('/forecasts/scenarios', stub('forecasts', 'scenarios'));

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

