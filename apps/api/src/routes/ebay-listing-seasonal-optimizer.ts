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
router.get('/dashboard/seasonal-items', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'seasonal-items' })
);
router.get('/dashboard/opportunities', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'opportunities' })
);
router.get('/dashboard/calendar', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'calendar' })
);

// Seasons (6)
router.get('/seasons', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'list' })
);
router.get('/seasons/:id', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'detail' })
);
router.post('/seasons', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'create' })
);
router.post('/seasons/:id/activate', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'activate' })
);
router.post('/seasons/:id/deactivate', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'deactivate' })
);
router.get('/seasons/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'history' })
);

// Products (4)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/:id/tag', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'tag' })
);
router.post('/products/bulk-tag', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'bulk-tag' })
);

// Strategies (4)
router.get('/strategies', (_req: Request, res: Response) =>
  res.json({ section: 'strategies', action: 'list' })
);
router.get('/strategies/:id', (_req: Request, res: Response) =>
  res.json({ section: 'strategies', action: 'detail' })
);
router.post('/strategies', (_req: Request, res: Response) =>
  res.json({ section: 'strategies', action: 'create' })
);
router.put('/strategies/:id', (_req: Request, res: Response) =>
  res.json({ section: 'strategies', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/seasonal-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'seasonal-performance' })
);
router.get('/analytics/year-over-year', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'year-over-year' })
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

