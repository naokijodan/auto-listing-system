import { Router } from 'express';
import type { Request, Response } from 'express';

// 在庫スマートリバランサー (テーマカラー: rose-600)
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

// inventory (6)
register('inventory', 'list');
register('inventory', 'detail');
register('inventory', 'rebalancing');
register('inventory', 'allocate');
register('inventory', 'update');
register('inventory', 'bulk');

// transfers (4)
register('transfers', 'list');
register('transfers', 'create');
register('transfers', 'update');
register('transfers', 'cancel');

// rules (4)
register('rules', 'list');
register('rules', 'create');
register('rules', 'update');
register('rules', 'remove');

// analytics (3)
register('analytics', 'overview');
register('analytics', 'trends');
register('analytics', 'performance');

// settings (2)
register('settings', 'get');
register('settings', 'update');

// utilities (4)
register('utilities', 'import');
register('utilities', 'export');
register('utilities', 'validate');
register('utilities', 'sync');

export default router;

