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
router.get('/dashboard/categorized', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'categorized' })
);
router.get('/dashboard/uncategorized', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'uncategorized' })
);
router.get('/dashboard/suggestions', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'suggestions' })
);

// Categories (6)
router.get('/categories', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'list' })
);
router.get('/categories/:id', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'detail' })
);
router.post('/categories/suggest', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'suggest' })
);
router.post('/categories/apply', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'apply' })
);
router.post('/categories/bulk-apply', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'bulk-apply' })
);
router.get('/categories/history', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'history' })
);

// Mappings (4)
router.get('/mappings', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'list' })
);
router.get('/mappings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'detail' })
);
router.post('/mappings/create', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'create' })
);
router.put('/mappings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'update' })
);

// Rules (4)
router.get('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.post('/rules/create', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.put('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/categorization-accuracy', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'categorization-accuracy' })
);
router.get('/analytics/category-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'category-performance' })
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

