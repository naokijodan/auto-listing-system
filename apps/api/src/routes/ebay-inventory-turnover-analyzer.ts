import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'overview' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/fast-moving', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'fast-moving' })
);
router.get('/dashboard/slow-moving', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'slow-moving' })
);
router.get('/dashboard/stagnant', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'stagnant' })
);

// Products (6)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/:id/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'analyze' })
);
router.post('/products/compare', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'compare' })
);
router.get('/products/benchmark', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'benchmark' })
);
router.get('/products/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'history' })
);

// Categories (4)
router.get('/categories', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'list' })
);
router.get('/categories/:id', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'detail' })
);
router.post('/categories/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'analyze' })
);
router.get('/categories/rank', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'rank' })
);

// Reports (4)
router.get('/reports', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'list' })
);
router.get('/reports/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'detail' })
);
router.post('/reports/generate', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'generate' })
);
router.post('/reports/schedule', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'schedule' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/turnover-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'turnover-trend' })
);
router.get('/analytics/category-comparison', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'category-comparison' })
);

// Settings (2)
router.get('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'get' })
);
router.put('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'update' })
);

// Utilities (4)
router.get('/health', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'health' })
);
router.post('/export', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'export' })
);
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

