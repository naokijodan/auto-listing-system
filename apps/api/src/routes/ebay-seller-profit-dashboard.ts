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
router.get('/dashboard/revenue', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'revenue' })
);
router.get('/dashboard/costs', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'costs' })
);
router.get('/dashboard/net-profit', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'net-profit' })
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
router.get('/products/top-profit', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'top-profit' })
);
router.get('/products/loss-makers', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'loss-makers' })
);

// Expenses (4)
router.get('/expenses', (_req: Request, res: Response) =>
  res.json({ section: 'expenses', action: 'list' })
);
router.get('/expenses/:id', (_req: Request, res: Response) =>
  res.json({ section: 'expenses', action: 'detail' })
);
router.post('/expenses', (_req: Request, res: Response) =>
  res.json({ section: 'expenses', action: 'create' })
);
router.post('/expenses/:id/categorize', (_req: Request, res: Response) =>
  res.json({ section: 'expenses', action: 'categorize' })
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
router.get('/analytics/profit-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'profit-trend' })
);
router.get('/analytics/margin-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'margin-distribution' })
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

