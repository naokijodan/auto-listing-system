import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const stub = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', stub('dashboard', 'overview'));
router.get('/dashboard/summary', stub('dashboard', 'summary'));
router.get('/dashboard/alerts', stub('dashboard', 'alerts'));
router.get('/dashboard/route-health', stub('dashboard', 'route-health'));
router.get('/dashboard/recommendations', stub('dashboard', 'recommendations'));

// orders (6)
router.get('/orders/list', stub('orders', 'list'));
router.get('/orders/detail', stub('orders', 'detail'));
router.get('/orders/assign', stub('orders', 'assign'));
router.get('/orders/hold', stub('orders', 'hold'));
router.get('/orders/release', stub('orders', 'release'));
router.get('/orders/cancel', stub('orders', 'cancel'));

// routing (4)
router.get('/routing/simulate', stub('routing', 'simulate'));
router.get('/routing/optimize', stub('routing', 'optimize'));
router.get('/routing/carriers', stub('routing', 'carriers'));
router.get('/routing/constraints', stub('routing', 'constraints'));

// rules (4)
router.get('/rules/list', stub('rules', 'list'));
router.get('/rules/detail', stub('rules', 'detail'));
router.get('/rules/create', stub('rules', 'create'));
router.get('/rules/update', stub('rules', 'update'));

// analytics (3)
router.get('/analytics/overview', stub('analytics', 'overview'));
router.get('/analytics/route-efficiency', stub('analytics', 'route-efficiency'));
router.get('/analytics/sla', stub('analytics', 'sla'));

// settings (2)
router.get('/settings/get', stub('settings', 'get'));
router.get('/settings/update', stub('settings', 'update'));

// utilities (4)
router.get('/utilities/ping', stub('utilities', 'ping'));
router.get('/utilities/status', stub('utilities', 'status'));
router.get('/utilities/export', stub('utilities', 'export'));
router.get('/utilities/import', stub('utilities', 'import'));

export default router;

