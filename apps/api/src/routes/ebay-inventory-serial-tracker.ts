import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const makeHandler = (section: string, action: string) =>
  (_req: Request, res: Response) => res.json({ section, action });

// dashboard (5)
router.get('/dashboard/overview', makeHandler('dashboard', 'overview'));
router.get('/dashboard/metrics', makeHandler('dashboard', 'metrics'));
router.get('/dashboard/status', makeHandler('dashboard', 'status'));
router.get('/dashboard/summaries', makeHandler('dashboard', 'summaries'));
router.get('/dashboard/alerts', makeHandler('dashboard', 'alerts'));

// inventory (6)
router.get('/inventory/all', makeHandler('inventory', 'all'));
router.get('/inventory/low-stock', makeHandler('inventory', 'low-stock'));
router.get('/inventory/receiving', makeHandler('inventory', 'receiving'));
router.get('/inventory/locations', makeHandler('inventory', 'locations'));
router.get('/inventory/adjustments', makeHandler('inventory', 'adjustments'));
router.get('/inventory/errors', makeHandler('inventory', 'errors'));

// serials (4)
router.get('/serials/lookup', makeHandler('serials', 'lookup'));
router.get('/serials/assign', makeHandler('serials', 'assign'));
router.get('/serials/validate', makeHandler('serials', 'validate'));
router.get('/serials/bulk', makeHandler('serials', 'bulk'));

// history (4)
router.get('/history/trace', makeHandler('history', 'trace'));
router.get('/history/transactions', makeHandler('history', 'transactions'));
router.get('/history/ownership', makeHandler('history', 'ownership'));
router.get('/history/audits', makeHandler('history', 'audits'));

// analytics (3)
router.get('/analytics/summary', makeHandler('analytics', 'summary'));
router.get('/analytics/trends', makeHandler('analytics', 'trends'));
router.get('/analytics/performance', makeHandler('analytics', 'performance'));

// settings (2)
router.get('/settings/get', makeHandler('settings', 'get'));
router.get('/settings/update', makeHandler('settings', 'update'));

// utilities (4)
router.get('/utilities/health', makeHandler('utilities', 'health'));
router.get('/utilities/ping', makeHandler('utilities', 'ping'));
router.get('/utilities/version', makeHandler('utilities', 'version'));
router.get('/utilities/help', makeHandler('utilities', 'help'));

export default router;

