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

// recalls (6)
router.get('/recalls', h('recalls', 'list'));
router.get('/recalls/overview', h('recalls', 'overview'));
router.get('/recalls/create', h('recalls', 'create'));
router.get('/recalls/update', h('recalls', 'update'));
router.get('/recalls/notify', h('recalls', 'notify'));
router.get('/recalls/history', h('recalls', 'history'));

// products (4)
router.get('/products', h('products', 'list'));
router.get('/products/overview', h('products', 'overview'));
router.get('/products/affected', h('products', 'affected'));
router.get('/products/replace', h('products', 'replace'));

// notifications (4)
router.get('/notifications', h('notifications', 'list'));
router.get('/notifications/overview', h('notifications', 'overview'));
router.get('/notifications/send', h('notifications', 'send'));
router.get('/notifications/status', h('notifications', 'status'));

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

