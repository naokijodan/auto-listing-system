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
router.get('/dashboard/negotiations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'negotiations' })
);
router.get('/dashboard/savings', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'savings' })
);
router.get('/dashboard/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'carriers' })
);

// Negotiations (6)
router.get('/negotiations', (_req: Request, res: Response) =>
  res.json({ section: 'negotiations', action: 'list' })
);
router.get('/negotiations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'negotiations', action: 'detail' })
);
router.post('/negotiations', (_req: Request, res: Response) =>
  res.json({ section: 'negotiations', action: 'create' })
);
router.post('/negotiations/:id/submit', (_req: Request, res: Response) =>
  res.json({ section: 'negotiations', action: 'submit' })
);
router.post('/negotiations/:id/accept', (_req: Request, res: Response) =>
  res.json({ section: 'negotiations', action: 'accept' })
);
router.post('/negotiations/:id/reject', (_req: Request, res: Response) =>
  res.json({ section: 'negotiations', action: 'reject' })
);

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'list' })
);
router.get('/carriers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'detail' })
);
router.get('/carriers/compare', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'compare' })
);
router.get('/carriers/rank', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'rank' })
);

// Contracts (4)
router.get('/contracts', (_req: Request, res: Response) =>
  res.json({ section: 'contracts', action: 'list' })
);
router.get('/contracts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'contracts', action: 'detail' })
);
router.post('/contracts', (_req: Request, res: Response) =>
  res.json({ section: 'contracts', action: 'create' })
);
router.post('/contracts/:id/renew', (_req: Request, res: Response) =>
  res.json({ section: 'contracts', action: 'renew' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/savings-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'savings-trend' })
);
router.get('/analytics/carrier-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'carrier-performance' })
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

