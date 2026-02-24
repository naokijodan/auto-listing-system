import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'dashboard' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/tags', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'tags' })
);
router.get('/dashboard/untagged', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'untagged' })
);
router.get('/dashboard/popular', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'popular' })
);

// Tags (6)
router.get('/tags/list', (_req: Request, res: Response) =>
  res.json({ section: 'tags', action: 'list' })
);
router.get('/tags/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'tags', action: 'detail' })
);
router.post('/tags/create', (_req: Request, res: Response) =>
  res.json({ section: 'tags', action: 'create' })
);
router.put('/tags/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'tags', action: 'update' })
);
router.post('/tags/merge', (_req: Request, res: Response) =>
  res.json({ section: 'tags', action: 'merge' })
);
router.delete('/tags/delete/:id', (_req: Request, res: Response) =>
  res.json({ section: 'tags', action: 'delete' })
);

// Products (4)
router.get('/products/list', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/assign-tags', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'assign-tags' })
);
router.post('/products/remove-tags', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'remove-tags' })
);

// Groups (4)
router.get('/groups/list', (_req: Request, res: Response) =>
  res.json({ section: 'groups', action: 'list' })
);
router.get('/groups/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'groups', action: 'detail' })
);
router.post('/groups/create', (_req: Request, res: Response) =>
  res.json({ section: 'groups', action: 'create' })
);
router.put('/groups/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'groups', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/tag-usage', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'tag-usage' })
);
router.get('/analytics/performance-by-tag', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'performance-by-tag' })
);

// Settings (2)
router.get('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'get' })
);
router.put('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'put' })
);

// Utilities (4)
router.get('/health', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'health' })
);
router.get('/export', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'export' })
);
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

