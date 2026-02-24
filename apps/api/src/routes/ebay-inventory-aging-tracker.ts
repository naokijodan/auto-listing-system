import { Router } from 'express';
import type { Request, Response } from 'express';

// 在庫エイジングトラッカー (テーマカラー: orange-600)
const router = Router();

const handle = (section: string, action: string) => (_req: Request, res: Response) =>
  res.json({ section, action });

// dashboard (5)
router.get('/dashboard/summary', handle('dashboard', 'summary'));
router.get('/dashboard/metrics', handle('dashboard', 'metrics'));
router.get('/dashboard/status', handle('dashboard', 'status'));
router.get('/dashboard/recent', handle('dashboard', 'recent'));
router.get('/dashboard/performance', handle('dashboard', 'performance'));

// products (6)
router.get('/products/list', handle('products', 'list'));
router.get('/products/aging', handle('products', 'aging'));
router.get('/products/slow', handle('products', 'slow'));
router.get('/products/replenish', handle('products', 'replenish'));
router.get('/products/markdown', handle('products', 'markdown'));
router.get('/products/export', handle('products', 'export'));

// categories (4)
router.get('/categories/list', handle('categories', 'list'));
router.get('/categories/aging', handle('categories', 'aging'));
router.get('/categories/slow', handle('categories', 'slow'));
router.get('/categories/heatmap', handle('categories', 'heatmap'));

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

