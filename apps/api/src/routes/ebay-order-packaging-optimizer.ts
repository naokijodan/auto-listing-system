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

// orders (6)
router.get('/orders/all', makeHandler('orders', 'all'));
router.get('/orders/pending', makeHandler('orders', 'pending'));
router.get('/orders/ready', makeHandler('orders', 'ready'));
router.get('/orders/shipped', makeHandler('orders', 'shipped'));
router.get('/orders/returns', makeHandler('orders', 'returns'));
router.get('/orders/errors', makeHandler('orders', 'errors'));

// packages (4)
router.get('/packages/presets', makeHandler('packages', 'presets'));
router.get('/packages/optimizer', makeHandler('packages', 'optimizer'));
router.get('/packages/suggestions', makeHandler('packages', 'suggestions'));
router.get('/packages/history', makeHandler('packages', 'history'));

// materials (4)
router.get('/materials/list', makeHandler('materials', 'list'));
router.get('/materials/stock', makeHandler('materials', 'stock'));
router.get('/materials/costs', makeHandler('materials', 'costs'));
router.get('/materials/vendors', makeHandler('materials', 'vendors'));

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

