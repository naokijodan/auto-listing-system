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

// bundles (6)
router.get('/bundles/all', makeHandler('bundles', 'all'));
router.get('/bundles/new', makeHandler('bundles', 'new'));
router.get('/bundles/draft', makeHandler('bundles', 'draft'));
router.get('/bundles/active', makeHandler('bundles', 'active'));
router.get('/bundles/archive', makeHandler('bundles', 'archive'));
router.get('/bundles/errors', makeHandler('bundles', 'errors'));

// products (4)
router.get('/products/all', makeHandler('products', 'all'));
router.get('/products/components', makeHandler('products', 'components'));
router.get('/products/compatibility', makeHandler('products', 'compatibility'));
router.get('/products/search', makeHandler('products', 'search'));

// pricing (4)
router.get('/pricing/strategies', makeHandler('pricing', 'strategies'));
router.get('/pricing/suggestions', makeHandler('pricing', 'suggestions'));
router.get('/pricing/simulator', makeHandler('pricing', 'simulator'));
router.get('/pricing/history', makeHandler('pricing', 'history'));

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

