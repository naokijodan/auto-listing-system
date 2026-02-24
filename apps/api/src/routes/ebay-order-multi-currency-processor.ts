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

// orders (6)
router.get('/orders/summary', stub('orders', 'summary'));
router.get('/orders/create', stub('orders', 'create'));
router.get('/orders/update', stub('orders', 'update'));
router.get('/orders/cancel', stub('orders', 'cancel'));
router.get('/orders/bulk', stub('orders', 'bulk'));
router.get('/orders/reconcile', stub('orders', 'reconcile'));

// currencies (4)
router.get('/currencies/summary', stub('currencies', 'summary'));
router.get('/currencies/list', stub('currencies', 'list'));
router.get('/currencies/enable', stub('currencies', 'enable'));
router.get('/currencies/disable', stub('currencies', 'disable'));

// conversions (4)
router.get('/conversions/summary', stub('conversions', 'summary'));
router.get('/conversions/rates', stub('conversions', 'rates'));
router.get('/conversions/apply', stub('conversions', 'apply'));
router.get('/conversions/history', stub('conversions', 'history'));

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

