import { Router } from 'express';
import type { Request, Response } from 'express';

// 商品マーケットリサーチ (テーマカラー: sky-600)
const router = Router();

const register = (section: string, action: string) => {
  router.get(`/${section}/${action}`, (_req: Request, res: Response) =>
    res.json({ section, action })
  );
};

// dashboard (5)
register('dashboard', 'overview');
register('dashboard', 'stats');
register('dashboard', 'summary');
register('dashboard', 'performance');
register('dashboard', 'health');

// products (6)
register('products', 'list');
register('products', 'detail');
register('products', 'create');
register('products', 'update');
register('products', 'remove');
register('products', 'bulk');

// markets (4)
register('markets', 'list');
register('markets', 'trends');
register('markets', 'regions');
register('markets', 'demand');

// competitors (4)
register('competitors', 'list');
register('competitors', 'pricing');
register('competitors', 'share');
register('competitors', 'watchlist');

// analytics (3)
register('analytics', 'traffic');
register('analytics', 'sales');
register('analytics', 'conversion');

// settings (2)
register('settings', 'get');
register('settings', 'update');

// utilities (4)
register('utilities', 'import');
register('utilities', 'export');
register('utilities', 'validate');
register('utilities', 'sync');

export default router;

