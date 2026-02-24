import { Router } from 'express';
import type { Request, Response } from 'express';

// セラー競合インテリジェンス (テーマカラー: pink-600)
const router = Router();

const handle = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/summary', handle('dashboard', 'summary'));
router.get('/dashboard/metrics', handle('dashboard', 'metrics'));
router.get('/dashboard/status', handle('dashboard', 'status'));
router.get('/dashboard/recent', handle('dashboard', 'recent'));
router.get('/dashboard/performance', handle('dashboard', 'performance'));

// competitors (6)
router.get('/competitors/list', handle('competitors', 'list'));
router.get('/competitors/track', handle('competitors', 'track'));
router.get('/competitors/untrack', handle('competitors', 'untrack'));
router.get('/competitors/compare', handle('competitors', 'compare'));
router.get('/competitors/insights', handle('competitors', 'insights'));
router.get('/competitors/alerts', handle('competitors', 'alerts'));

// benchmarks (4)
router.get('/benchmarks/price', handle('benchmarks', 'price'));
router.get('/benchmarks/shipping', handle('benchmarks', 'shipping'));
router.get('/benchmarks/rating', handle('benchmarks', 'rating'));
router.get('/benchmarks/velocity', handle('benchmarks', 'velocity'));

// alerts (4)
router.get('/alerts/list', handle('alerts', 'list'));
router.get('/alerts/create', handle('alerts', 'create'));
router.get('/alerts/resolve', handle('alerts', 'resolve'));
router.get('/alerts/snooze', handle('alerts', 'snooze'));

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

