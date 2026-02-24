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
router.get('/dashboard/upcoming', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'upcoming' })
);
router.get('/dashboard/completed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'completed' })
);
router.get('/dashboard/held', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'held' })
);

// Payouts (6)
router.get('/payouts', (_req: Request, res: Response) =>
  res.json({ section: 'payouts', action: 'list' })
);
router.get('/payouts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'payouts', action: 'detail' })
);
router.get('/payouts/:id/track', (_req: Request, res: Response) =>
  res.json({ section: 'payouts', action: 'track' })
);
router.post('/payouts/:id/reconcile', (_req: Request, res: Response) =>
  res.json({ section: 'payouts', action: 'reconcile' })
);
router.post('/payouts/:id/dispute', (_req: Request, res: Response) =>
  res.json({ section: 'payouts', action: 'dispute' })
);
router.post('/payouts/export', (_req: Request, res: Response) =>
  res.json({ section: 'payouts', action: 'export' })
);

// Holds (4)
router.get('/holds', (_req: Request, res: Response) =>
  res.json({ section: 'holds', action: 'list' })
);
router.get('/holds/:id', (_req: Request, res: Response) =>
  res.json({ section: 'holds', action: 'detail' })
);
router.post('/holds/:id/resolve', (_req: Request, res: Response) =>
  res.json({ section: 'holds', action: 'resolve' })
);
router.post('/holds/:id/appeal', (_req: Request, res: Response) =>
  res.json({ section: 'holds', action: 'appeal' })
);

// Fees (4)
router.get('/fees', (_req: Request, res: Response) =>
  res.json({ section: 'fees', action: 'list' })
);
router.get('/fees/:id', (_req: Request, res: Response) =>
  res.json({ section: 'fees', action: 'detail' })
);
router.get('/fees/:id/breakdown', (_req: Request, res: Response) =>
  res.json({ section: 'fees', action: 'breakdown' })
);
router.get('/fees/compare', (_req: Request, res: Response) =>
  res.json({ section: 'fees', action: 'compare' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/payout-trends', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'payout-trends' })
);
router.get('/analytics/fee-analysis', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'fee-analysis' })
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

