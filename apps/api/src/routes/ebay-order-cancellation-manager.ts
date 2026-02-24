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
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/approved', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'approved' })
);
router.get('/dashboard/denied', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'denied' })
);

// Cancellations (6)
router.get('/cancellations', (_req: Request, res: Response) =>
  res.json({ section: 'cancellations', action: 'list' })
);
router.get('/cancellations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'cancellations', action: 'detail' })
);
router.post('/cancellations/request', (_req: Request, res: Response) =>
  res.json({ section: 'cancellations', action: 'request' })
);
router.post('/cancellations/:id/approve', (_req: Request, res: Response) =>
  res.json({ section: 'cancellations', action: 'approve' })
);
router.post('/cancellations/:id/deny', (_req: Request, res: Response) =>
  res.json({ section: 'cancellations', action: 'deny' })
);
router.post('/cancellations/bulk-process', (_req: Request, res: Response) =>
  res.json({ section: 'cancellations', action: 'bulk-process' })
);

// Reasons (4)
router.get('/reasons', (_req: Request, res: Response) =>
  res.json({ section: 'reasons', action: 'list' })
);
router.get('/reasons/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reasons', action: 'detail' })
);
router.post('/reasons', (_req: Request, res: Response) =>
  res.json({ section: 'reasons', action: 'create' })
);
router.put('/reasons/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reasons', action: 'update' })
);

// Refunds (4)
router.get('/refunds', (_req: Request, res: Response) =>
  res.json({ section: 'refunds', action: 'list' })
);
router.get('/refunds/:id', (_req: Request, res: Response) =>
  res.json({ section: 'refunds', action: 'detail' })
);
router.post('/refunds/:id/process', (_req: Request, res: Response) =>
  res.json({ section: 'refunds', action: 'process' })
);
router.get('/refunds/:id/track', (_req: Request, res: Response) =>
  res.json({ section: 'refunds', action: 'track' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/cancellation-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'cancellation-rate' })
);
router.get('/analytics/revenue-impact', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'revenue-impact' })
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

