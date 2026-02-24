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

// products (6)
router.get('/products/summary', stub('products', 'summary'));
router.get('/products/create', stub('products', 'create'));
router.get('/products/update', stub('products', 'update'));
router.get('/products/delete', stub('products', 'delete'));
router.get('/products/bulk', stub('products', 'bulk'));
router.get('/products/catalog', stub('products', 'catalog'));

// materials (4)
router.get('/materials/summary', stub('materials', 'summary'));
router.get('/materials/add', stub('materials', 'add'));
router.get('/materials/remove', stub('materials', 'remove'));
router.get('/materials/reconcile', stub('materials', 'reconcile'));

// sourcing (4)
router.get('/sourcing/summary', stub('sourcing', 'summary'));
router.get('/sourcing/suppliers', stub('sourcing', 'suppliers'));
router.get('/sourcing/purchase-orders', stub('sourcing', 'purchase-orders'));
router.get('/sourcing/receive', stub('sourcing', 'receive'));

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

