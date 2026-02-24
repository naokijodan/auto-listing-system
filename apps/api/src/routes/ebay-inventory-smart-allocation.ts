import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const stub = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', stub('dashboard', 'overview'));
router.get('/dashboard/summary', stub('dashboard', 'summary'));
router.get('/dashboard/stock-health', stub('dashboard', 'stock-health'));
router.get('/dashboard/alerts', stub('dashboard', 'alerts'));
router.get('/dashboard/recommendations', stub('dashboard', 'recommendations'));

// inventory (6)
router.get('/inventory/list', stub('inventory', 'list'));
router.get('/inventory/detail', stub('inventory', 'detail'));
router.get('/inventory/add', stub('inventory', 'add'));
router.get('/inventory/update', stub('inventory', 'update'));
router.get('/inventory/relocate', stub('inventory', 'relocate'));
router.get('/inventory/adjust', stub('inventory', 'adjust'));

// allocation (4)
router.get('/allocation/overview', stub('allocation', 'overview'));
router.get('/allocation/run', stub('allocation', 'run'));
router.get('/allocation/preview', stub('allocation', 'preview'));
router.get('/allocation/commit', stub('allocation', 'commit'));

// strategies (4)
router.get('/strategies/list', stub('strategies', 'list'));
router.get('/strategies/detail', stub('strategies', 'detail'));
router.get('/strategies/create', stub('strategies', 'create'));
router.get('/strategies/update', stub('strategies', 'update'));

// analytics (3)
router.get('/analytics/overview', stub('analytics', 'overview'));
router.get('/analytics/allocation-efficiency', stub('analytics', 'allocation-efficiency'));
router.get('/analytics/stockout-risk', stub('analytics', 'stockout-risk'));

// settings (2)
router.get('/settings/get', stub('settings', 'get'));
router.get('/settings/update', stub('settings', 'update'));

// utilities (4)
router.get('/utilities/ping', stub('utilities', 'ping'));
router.get('/utilities/status', stub('utilities', 'status'));
router.get('/utilities/export', stub('utilities', 'export'));
router.get('/utilities/import', stub('utilities', 'import'));

export default router;

