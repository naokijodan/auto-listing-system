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

// transactions (6)
router.get('/transactions/all', makeHandler('transactions', 'all'));
router.get('/transactions/incoming', makeHandler('transactions', 'incoming'));
router.get('/transactions/outgoing', makeHandler('transactions', 'outgoing'));
router.get('/transactions/settlements', makeHandler('transactions', 'settlements'));
router.get('/transactions/disputes', makeHandler('transactions', 'disputes'));
router.get('/transactions/errors', makeHandler('transactions', 'errors'));

// forecasts (4)
router.get('/forecasts/short-term', makeHandler('forecasts', 'short-term'));
router.get('/forecasts/long-term', makeHandler('forecasts', 'long-term'));
router.get('/forecasts/scenarios', makeHandler('forecasts', 'scenarios'));
router.get('/forecasts/assumptions', makeHandler('forecasts', 'assumptions'));

// reports (4)
router.get('/reports/summary', makeHandler('reports', 'summary'));
router.get('/reports/cashflow', makeHandler('reports', 'cashflow'));
router.get('/reports/profit-loss', makeHandler('reports', 'profit-loss'));
router.get('/reports/export', makeHandler('reports', 'export'));

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

