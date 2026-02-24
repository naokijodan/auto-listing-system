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
router.get('/dashboard/tracked', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'tracked' })
);
router.get('/dashboard/changes', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'changes' })
);
router.get('/dashboard/opportunities', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'opportunities' })
);

// Competitors (6)
router.get('/competitors/list', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'list' })
);
router.get('/competitors/detail', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'detail' })
);
router.get('/competitors/track', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'track' })
);
router.get('/competitors/untrack', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'untrack' })
);
router.get('/competitors/compare', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'compare' })
);
router.get('/competitors/history', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'history' })
);

// Listings (4)
router.get('/listings/list', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'list' })
);
router.get('/listings/detail', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'detail' })
);
router.get('/listings/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'analyze' })
);
router.get('/listings/benchmark', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'benchmark' })
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
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/competitor-activity', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'competitor-activity' })
);
router.get('/analytics/market-share', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'market-share' })
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

