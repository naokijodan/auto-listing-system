import { Router } from 'express';
import type { Request, Response } from 'express';

// 出品ビジュアルマーチャンダイジング (テーマカラー: amber-600)
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

// listings (6)
register('listings', 'list');
register('listings', 'detail');
register('listings', 'create');
register('listings', 'update');
register('listings', 'remove');
register('listings', 'bulk');

// displays (4)
register('displays', 'list');
register('displays', 'create');
register('displays', 'update');
register('displays', 'remove');

// galleries (4)
register('galleries', 'list');
register('galleries', 'create');
register('galleries', 'update');
register('galleries', 'remove');

// analytics (3)
register('analytics', 'overview');
register('analytics', 'traffic');
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

