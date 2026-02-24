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
router.get('/dashboard/adequate', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'adequate' })
);
router.get('/dashboard/low', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'low' })
);
router.get('/dashboard/excess', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'excess' })
);

// Products (6)
router.get('/products/list', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/detail', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.get('/products/calculate', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'calculate' })
);
router.get('/products/adjust', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'adjust' })
);
router.get('/products/bulk-calculate', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'bulk-calculate' })
);
router.get('/products/history', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'history' })
);

// Parameters (4)
router.get('/parameters/list', (_req: Request, res: Response) =>
  res.json({ section: 'parameters', action: 'list' })
);
router.get('/parameters/detail', (_req: Request, res: Response) =>
  res.json({ section: 'parameters', action: 'detail' })
);
router.get('/parameters/configure', (_req: Request, res: Response) =>
  res.json({ section: 'parameters', action: 'configure' })
);
router.get('/parameters/optimize', (_req: Request, res: Response) =>
  res.json({ section: 'parameters', action: 'optimize' })
);

// Alerts (4)
router.get('/alerts/list', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'list' })
);
router.get('/alerts/detail', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'detail' })
);
router.get('/alerts/configure', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'configure' })
);
router.get('/alerts/dismiss', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'dismiss' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/stock-level-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'stock-level-trend' })
);
router.get('/analytics/stockout-risk', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'stockout-risk' })
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
router.get('/export', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'export' })
);
router.get('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.get('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

