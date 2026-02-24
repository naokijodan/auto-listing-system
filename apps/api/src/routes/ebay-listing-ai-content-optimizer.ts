import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const stub = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', stub('dashboard', 'overview'));
router.get('/dashboard/summary', stub('dashboard', 'summary'));
router.get('/dashboard/recent-activities', stub('dashboard', 'recent-activities'));
router.get('/dashboard/optimization-score', stub('dashboard', 'optimization-score'));
router.get('/dashboard/recommendations', stub('dashboard', 'recommendations'));

// listings (6)
router.get('/listings/list', stub('listings', 'list'));
router.get('/listings/detail', stub('listings', 'detail'));
router.get('/listings/create', stub('listings', 'create'));
router.get('/listings/update', stub('listings', 'update'));
router.get('/listings/publish', stub('listings', 'publish'));
router.get('/listings/archive', stub('listings', 'archive'));

// optimization (4)
router.get('/optimization/overview', stub('optimization', 'overview'));
router.get('/optimization/suggest', stub('optimization', 'suggest'));
router.get('/optimization/apply', stub('optimization', 'apply'));
router.get('/optimization/history', stub('optimization', 'history'));

// templates (4)
router.get('/templates/list', stub('templates', 'list'));
router.get('/templates/detail', stub('templates', 'detail'));
router.get('/templates/create', stub('templates', 'create'));
router.get('/templates/update', stub('templates', 'update'));

// analytics (3)
router.get('/analytics/overview', stub('analytics', 'overview'));
router.get('/analytics/performance', stub('analytics', 'performance'));
router.get('/analytics/engagement', stub('analytics', 'engagement'));

// settings (2)
router.get('/settings/get', stub('settings', 'get'));
router.get('/settings/update', stub('settings', 'update'));

// utilities (4)
router.get('/utilities/ping', stub('utilities', 'ping'));
router.get('/utilities/status', stub('utilities', 'status'));
router.get('/utilities/export', stub('utilities', 'export'));
router.get('/utilities/import', stub('utilities', 'import'));

export default router;

