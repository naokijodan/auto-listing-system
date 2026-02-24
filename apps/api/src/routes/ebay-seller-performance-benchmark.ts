import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const stub = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', stub('dashboard', 'overview'));
router.get('/dashboard/summary', stub('dashboard', 'summary'));
router.get('/dashboard/alerts', stub('dashboard', 'alerts'));
router.get('/dashboard/kpi-score', stub('dashboard', 'kpi-score'));
router.get('/dashboard/recommendations', stub('dashboard', 'recommendations'));

// sellers (6)
router.get('/sellers/list', stub('sellers', 'list'));
router.get('/sellers/detail', stub('sellers', 'detail'));
router.get('/sellers/add', stub('sellers', 'add'));
router.get('/sellers/update', stub('sellers', 'update'));
router.get('/sellers/suspend', stub('sellers', 'suspend'));
router.get('/sellers/reactivate', stub('sellers', 'reactivate'));

// benchmarks (4)
router.get('/benchmarks/list', stub('benchmarks', 'list'));
router.get('/benchmarks/detail', stub('benchmarks', 'detail'));
router.get('/benchmarks/create', stub('benchmarks', 'create'));
router.get('/benchmarks/update', stub('benchmarks', 'update'));

// comparisons (4)
router.get('/comparisons/list', stub('comparisons', 'list'));
router.get('/comparisons/peers', stub('comparisons', 'peers'));
router.get('/comparisons/regions', stub('comparisons', 'regions'));
router.get('/comparisons/categories', stub('comparisons', 'categories'));

// analytics (3)
router.get('/analytics/overview', stub('analytics', 'overview'));
router.get('/analytics/kpis', stub('analytics', 'kpis'));
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

