import { Router } from 'express';
import type { Request, Response } from 'express';

// セラーAIアドバイザー (テーマカラー: teal-600)
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

// advice (6)
register('advice', 'list');
register('advice', 'detail');
register('advice', 'generate');
register('advice', 'apply');
register('advice', 'feedback');
register('advice', 'archive');

// strategies (4)
register('strategies', 'list');
register('strategies', 'create');
register('strategies', 'update');
register('strategies', 'remove');

// predictions (4)
register('predictions', 'list');
register('predictions', 'generate');
register('predictions', 'validate');
register('predictions', 'compare');

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

