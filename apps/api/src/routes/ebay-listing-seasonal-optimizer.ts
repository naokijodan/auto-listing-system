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

// Listings (6)
router.get('/listings', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'list' })
);
router.get('/listings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'detail' })
);
router.post('/listings', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'create' })
);
router.put('/listings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'update' })
);
router.delete('/listings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'delete' })
);
router.post('/listings/:id/schedule', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'schedule' })
);

// Seasons (4)
router.get('/seasons', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'list' })
);
router.get('/seasons/:id', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'detail' })
);
router.post('/seasons', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'create' })
);
router.put('/seasons/:id', (_req: Request, res: Response) =>
  res.json({ section: 'seasons', action: 'update' })
);

// Campaigns (4)
router.get('/campaigns', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'list' })
);
router.get('/campaigns/:id', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'detail' })
);
router.post('/campaigns', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'create' })
);
router.put('/campaigns/:id', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'update' })
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
