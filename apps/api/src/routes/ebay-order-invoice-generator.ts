import { Router } from 'express';
import type { Request, Response } from 'express';

// 注文インボイスジェネレーター (テーマカラー: cyan-600)
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

// invoices (6)
register('invoices', 'list');
register('invoices', 'detail');
register('invoices', 'create');
register('invoices', 'update');
register('invoices', 'remove');
register('invoices', 'bulk');

// templates (4)
register('templates', 'list');
register('templates', 'preview');
register('templates', 'apply');
register('templates', 'reset');

// exports (4)
register('exports', 'list');
register('exports', 'run');
register('exports', 'schedule');
register('exports', 'history');

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

