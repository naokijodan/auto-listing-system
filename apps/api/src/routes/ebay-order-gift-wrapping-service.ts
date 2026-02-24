import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

const h = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard', h('dashboard', 'dashboard'));
router.get('/dashboard/overview', h('dashboard', 'overview'));
router.get('/dashboard/metrics', h('dashboard', 'metrics'));
router.get('/dashboard/trends', h('dashboard', 'trends'));
router.get('/dashboard/alerts', h('dashboard', 'alerts'));

// orders (6)
router.get('/orders', h('orders', 'list'));
router.get('/orders/overview', h('orders', 'overview'));
router.get('/orders/detail', h('orders', 'detail'));
router.get('/orders/create', h('orders', 'create'));
router.get('/orders/update', h('orders', 'update'));
router.get('/orders/bulk', h('orders', 'bulk'));

// wrapping (4)
router.get('/wrapping', h('wrapping', 'list'));
router.get('/wrapping/overview', h('wrapping', 'overview'));
router.get('/wrapping/apply', h('wrapping', 'apply'));
router.get('/wrapping/styles', h('wrapping', 'styles'));

// options (4)
router.get('/options', h('options', 'list'));
router.get('/options/overview', h('options', 'overview'));
router.get('/options/update', h('options', 'update'));
router.get('/options/presets', h('options', 'presets'));

// analytics (3)
router.get('/analytics', h('analytics', 'analytics'));
router.get('/analytics/insights', h('analytics', 'insights'));
router.get('/analytics/trends', h('analytics', 'trends'));

// settings (2)
router.get('/settings', h('settings', 'settings'));
router.get('/settings/get', h('settings', 'get'));

// utilities (4)
router.get('/health', h('utilities', 'health'));
router.get('/status', h('utilities', 'status'));
router.get('/ping', h('utilities', 'ping'));
router.get('/info', h('utilities', 'info'));

export default router;

