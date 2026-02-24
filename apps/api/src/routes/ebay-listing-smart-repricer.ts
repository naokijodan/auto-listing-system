import { Router } from 'express';
import type { Request, Response } from 'express';

// 出品スマートリプライサー (テーマカラー: teal-600)
const router = Router();

const handle = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/summary', handle('dashboard', 'summary'));
router.get('/dashboard/metrics', handle('dashboard', 'metrics'));
router.get('/dashboard/status', handle('dashboard', 'status'));
router.get('/dashboard/recent', handle('dashboard', 'recent'));
router.get('/dashboard/performance', handle('dashboard', 'performance'));

// rules (6)
router.get('/rules/list', handle('rules', 'list'));
router.get('/rules/create', handle('rules', 'create'));
router.get('/rules/update', handle('rules', 'update'));
router.get('/rules/delete', handle('rules', 'delete'));
router.get('/rules/enable', handle('rules', 'enable'));
router.get('/rules/disable', handle('rules', 'disable'));

// competitors (4)
router.get('/competitors/list', handle('competitors', 'list'));
router.get('/competitors/track', handle('competitors', 'track'));
router.get('/competitors/untrack', handle('competitors', 'untrack'));
router.get('/competitors/insights', handle('competitors', 'insights'));

// history (4)
router.get('/history/price', handle('history', 'price'));
router.get('/history/sales', handle('history', 'sales'));
router.get('/history/events', handle('history', 'events'));
router.get('/history/logs', handle('history', 'logs'));

// analytics (3)
router.get('/analytics/overview', handle('analytics', 'overview'));
router.get('/analytics/trends', handle('analytics', 'trends'));
router.get('/analytics/forecast', handle('analytics', 'forecast'));

// settings (2)
router.get('/settings/get', handle('settings', 'get'));
router.get('/settings/update', handle('settings', 'update'));

// utilities (4)
router.get('/utilities/health', handle('utilities', 'health'));
router.get('/utilities/ping', handle('utilities', 'ping'));
router.get('/utilities/export', handle('utilities', 'export'));
router.get('/utilities/import', handle('utilities', 'import'));

export default router;

