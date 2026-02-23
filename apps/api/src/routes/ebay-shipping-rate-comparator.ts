import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Theme: pink-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'get' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/cheapest', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'cheapest' })
);
router.get('/dashboard/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'carriers-overview' })
);
router.get('/dashboard/savings', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'savings-overview' })
);

// Rates (6): CRUD + compare + bulk-compare
router.get('/rates', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'list' })
);
router.get('/rates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'detail' })
);
router.post('/rates/compare', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'compare' })
);
router.post('/rates/bulk-compare', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'bulk-compare' })
);
router.post('/rates/create', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'create' })
);
router.put('/rates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'update' })
);

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'list' })
);
router.get('/carriers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'detail' })
);
router.post('/carriers/create', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'create' })
);
router.put('/carriers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'update' })
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
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/cost-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'cost-trend' })
);
router.get('/analytics/delivery-speed', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'delivery-speed' })
);

// Settings (2) GET/PUT
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
router.post('/refresh', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'refresh' })
);

export default router;

