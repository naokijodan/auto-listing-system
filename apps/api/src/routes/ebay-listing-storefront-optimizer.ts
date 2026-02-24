import { Router } from 'express';
import type { Request, Response } from 'express';

// 出品ストアフロント最適化 (テーマカラー: purple-600)
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

// layouts (4)
register('layouts', 'current');
register('layouts', 'presets');
register('layouts', 'apply');
register('layouts', 'reset');

// themes (4)
register('themes', 'current');
register('themes', 'palette');
register('themes', 'apply');
register('themes', 'reset');

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

