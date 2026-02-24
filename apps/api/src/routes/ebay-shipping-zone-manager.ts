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
router.get('/dashboard/zones', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'zones' })
);
router.get('/dashboard/coverage', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'coverage' })
);
router.get('/dashboard/gaps', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'gaps' })
);

// Zones (6)
router.get('/zones/list', (_req: Request, res: Response) =>
  res.json({ section: 'zones', action: 'list' })
);
router.get('/zones/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'zones', action: 'detail' })
);
router.post('/zones/create', (_req: Request, res: Response) =>
  res.json({ section: 'zones', action: 'create' })
);
router.put('/zones/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'zones', action: 'update' })
);
router.post('/zones/merge', (_req: Request, res: Response) =>
  res.json({ section: 'zones', action: 'merge' })
);
router.post('/zones/split/:id', (_req: Request, res: Response) =>
  res.json({ section: 'zones', action: 'split' })
);

// Countries (4)
router.get('/countries/list', (_req: Request, res: Response) =>
  res.json({ section: 'countries', action: 'list' })
);
router.get('/countries/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'countries', action: 'detail' })
);
router.post('/countries/assign', (_req: Request, res: Response) =>
  res.json({ section: 'countries', action: 'assign' })
);
router.post('/countries/unassign', (_req: Request, res: Response) =>
  res.json({ section: 'countries', action: 'unassign' })
);

// Rates (4)
router.get('/rates/list', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'list' })
);
router.get('/rates/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'detail' })
);
router.post('/rates/create', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'create' })
);
router.put('/rates/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rates', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/zone-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'zone-performance' })
);
router.get('/analytics/cost-by-zone', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'cost-by-zone' })
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

