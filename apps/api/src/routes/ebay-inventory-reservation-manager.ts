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
router.get('/dashboard/active', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'active' })
);
router.get('/dashboard/expiring', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'expiring' })
);
router.get('/dashboard/released', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'released' })
);

// Reservations (6)
router.get('/reservations', (_req: Request, res: Response) =>
  res.json({ section: 'reservations', action: 'list' })
);
router.get('/reservations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reservations', action: 'detail' })
);
router.post('/reservations', (_req: Request, res: Response) =>
  res.json({ section: 'reservations', action: 'create' })
);
router.post('/reservations/:id/extend', (_req: Request, res: Response) =>
  res.json({ section: 'reservations', action: 'extend' })
);
router.post('/reservations/:id/release', (_req: Request, res: Response) =>
  res.json({ section: 'reservations', action: 'release' })
);
router.post('/reservations/bulk-release', (_req: Request, res: Response) =>
  res.json({ section: 'reservations', action: 'bulk-release' })
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

// Inventory (4)
router.get('/inventory', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'list' })
);
router.get('/inventory/:id', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'detail' })
);
router.get('/inventory/:id/availability', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'availability' })
);
router.get('/inventory/forecast', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'forecast' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/reservation-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'reservation-rate' })
);
router.get('/analytics/conversion-impact', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'conversion-impact' })
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
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

