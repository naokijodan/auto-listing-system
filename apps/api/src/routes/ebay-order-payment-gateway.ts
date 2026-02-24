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
router.get('/dashboard/transactions', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'transactions' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/failed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'failed' })
);

// Payments (6)
router.get('/payments', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'list' })
);
router.get('/payments/:id', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'detail' })
);
router.post('/payments/:id/process', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'process' })
);
router.post('/payments/:id/refund', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'refund' })
);
router.post('/payments/:id/verify', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'verify' })
);
router.get('/payments/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'payments', action: 'history' })
);

// Methods (4)
router.get('/methods', (_req: Request, res: Response) =>
  res.json({ section: 'methods', action: 'list' })
);
router.get('/methods/:id', (_req: Request, res: Response) =>
  res.json({ section: 'methods', action: 'detail' })
);
router.post('/methods', (_req: Request, res: Response) =>
  res.json({ section: 'methods', action: 'add' })
);
router.delete('/methods/:id', (_req: Request, res: Response) =>
  res.json({ section: 'methods', action: 'remove' })
);

// Disputes (4)
router.get('/disputes', (_req: Request, res: Response) =>
  res.json({ section: 'disputes', action: 'list' })
);
router.get('/disputes/:id', (_req: Request, res: Response) =>
  res.json({ section: 'disputes', action: 'detail' })
);
router.post('/disputes/:id/respond', (_req: Request, res: Response) =>
  res.json({ section: 'disputes', action: 'respond' })
);
router.post('/disputes/:id/resolve', (_req: Request, res: Response) =>
  res.json({ section: 'disputes', action: 'resolve' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/transaction-volume', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'transaction-volume' })
);
router.get('/analytics/payment-method-split', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'payment-method-split' })
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

