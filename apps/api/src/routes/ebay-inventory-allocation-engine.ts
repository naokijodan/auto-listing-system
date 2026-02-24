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
router.get('/dashboard/allocated', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'allocated' })
);
router.get('/dashboard/unallocated', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'unallocated' })
);
router.get('/dashboard/warnings', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'warnings' })
);

// Allocations (6)
router.get('/allocations', (_req: Request, res: Response) =>
  res.json({ section: 'allocations', action: 'list' })
);
router.get('/allocations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'allocations', action: 'detail' })
);
router.post('/allocations', (_req: Request, res: Response) =>
  res.json({ section: 'allocations', action: 'create' })
);
router.put('/allocations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'allocations', action: 'update' })
);
router.post('/allocations/bulk-allocate', (_req: Request, res: Response) =>
  res.json({ section: 'allocations', action: 'bulk-allocate' })
);
router.get('/allocations/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'allocations', action: 'history' })
);

// Channels (4)
router.get('/channels', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'list' })
);
router.get('/channels/:id', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'detail' })
);
router.post('/channels/:id/configure', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'configure' })
);
router.post('/channels/priority', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'priority' })
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

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/allocation-efficiency', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'allocation-efficiency' })
);
router.get('/analytics/channel-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'channel-performance' })
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

