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

// listings (6)
router.get('/listings/all', makeHandler('listings', 'all'));
router.get('/listings/new', makeHandler('listings', 'new'));
router.get('/listings/draft', makeHandler('listings', 'draft'));
router.get('/listings/active', makeHandler('listings', 'active'));
router.get('/listings/archived', makeHandler('listings', 'archived'));
router.get('/listings/errors', makeHandler('listings', 'errors'));

// categories (4)
router.get('/categories/tree', makeHandler('categories', 'tree'));
router.get('/categories/popular', makeHandler('categories', 'popular'));
router.get('/categories/recent', makeHandler('categories', 'recent'));
router.get('/categories/map', makeHandler('categories', 'map'));

// suggestions (4)
router.get('/suggestions/overview', makeHandler('suggestions', 'overview'));
router.get('/suggestions/category', makeHandler('suggestions', 'category'));
router.get('/suggestions/pricing', makeHandler('suggestions', 'pricing'));
router.get('/suggestions/keywords', makeHandler('suggestions', 'keywords'));

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

