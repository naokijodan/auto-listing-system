import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const stub = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', stub('dashboard', 'overview'));
router.get('/dashboard/summary', stub('dashboard', 'summary'));
router.get('/dashboard/alerts', stub('dashboard', 'alerts'));
router.get('/dashboard/hot-topics', stub('dashboard', 'hot-topics'));
router.get('/dashboard/recommendations', stub('dashboard', 'recommendations'));

// products (6)
router.get('/products/list', stub('products', 'list'));
router.get('/products/detail', stub('products', 'detail'));
router.get('/products/track', stub('products', 'track'));
router.get('/products/untrack', stub('products', 'untrack'));
router.get('/products/add', stub('products', 'add'));
router.get('/products/update', stub('products', 'update'));

// trends (4)
router.get('/trends/overview', stub('trends', 'overview'));
router.get('/trends/hot', stub('trends', 'hot'));
router.get('/trends/rising', stub('trends', 'rising'));
router.get('/trends/declining', stub('trends', 'declining'));

// scouting (4)
router.get('/scouting/overview', stub('scouting', 'overview'));
router.get('/scouting/keywords', stub('scouting', 'keywords'));
router.get('/scouting/alerts', stub('scouting', 'alerts'));
router.get('/scouting/sources', stub('scouting', 'sources'));

// analytics (3)
router.get('/analytics/overview', stub('analytics', 'overview'));
router.get('/analytics/performance', stub('analytics', 'performance'));
router.get('/analytics/opportunities', stub('analytics', 'opportunities'));

// settings (2)
router.get('/settings/get', stub('settings', 'get'));
router.get('/settings/update', stub('settings', 'update'));

// utilities (4)
router.get('/utilities/ping', stub('utilities', 'ping'));
router.get('/utilities/status', stub('utilities', 'status'));
router.get('/utilities/export', stub('utilities', 'export'));
router.get('/utilities/import', stub('utilities', 'import'));

export default router;

