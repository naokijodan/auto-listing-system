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
router.get('/dashboard/reconciled', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'reconciled' })
);
router.get('/dashboard/unreconciled', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'unreconciled' })
);
router.get('/dashboard/discrepancies', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'discrepancies' })
);

// Orders (6)
router.get('/orders', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'list' })
);
router.get('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'detail' })
);
router.post('/orders', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'create' })
);
router.put('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'update' })
);
router.post('/orders/:id/cancel', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'cancel' })
);
router.get('/orders/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'history' })
);

// Payments (4)
router.get('/payments', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'list' })
);
router.get('/payments/:id', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'detail' })
);
router.post('/payments/:id/match', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'match' })
);
router.post('/payments/:id/unmatch', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'unmatch' })
);

// Reconciliation (4)
router.get('/reconciliation', (_req: Request, res: Response) =>
  res.json({ section: 'reconciliation', action: 'overview' })
);
router.get('/reconciliation/discrepancies', (_req: Request, res: Response) =>
  res.json({ section: 'reconciliation', action: 'discrepancies' })
);
router.post('/reconciliation/resolve', (_req: Request, res: Response) =>
  res.json({ section: 'reconciliation', action: 'resolve' })
);
router.post('/reconciliation/rerun', (_req: Request, res: Response) =>
  res.json({ section: 'reconciliation', action: 'rerun' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/reconciliation-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'reconciliation-rate' })
);
router.get('/analytics/discrepancy-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'discrepancy-trend' })
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
