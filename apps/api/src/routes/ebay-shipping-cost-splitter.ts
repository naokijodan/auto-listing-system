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
router.get('/dashboard/splits', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'splits' })
);
router.get('/dashboard/savings', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'savings' })
);
router.get('/dashboard/consolidations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'consolidations' })
);

// Splits (6)
router.get('/splits', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'list' })
);
router.get('/splits/:id', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'detail' })
);
router.post('/splits', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'create' })
);
router.put('/splits/:id', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'update' })
);
router.delete('/splits/:id', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'delete' })
);
router.post('/splits/:id/consolidate', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'consolidate' })
);

// Orders (4)
router.get('/orders', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'list' })
);
router.get('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'detail' })
);
router.post('/orders/combine', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'combine' })
);
router.post('/orders/:id/separate', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'separate' })
);

// Rules (4)
router.get('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.post('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.put('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/cost-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'cost-distribution' })
);
router.get('/analytics/savings-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'savings-trend' })
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

