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
router.get('/dashboard/synced', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'synced' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/conflicts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'conflicts' })
);

// Syncs (6)
router.get('/syncs', (_req: Request, res: Response) =>
  res.json({ section: 'syncs', action: 'list' })
);
router.get('/syncs/:id', (_req: Request, res: Response) =>
  res.json({ section: 'syncs', action: 'detail' })
);
router.post('/syncs/:id/start', (_req: Request, res: Response) =>
  res.json({ section: 'syncs', action: 'start' })
);
router.post('/syncs/:id/stop', (_req: Request, res: Response) =>
  res.json({ section: 'syncs', action: 'stop' })
);
router.post('/syncs/bulk-sync', (_req: Request, res: Response) =>
  res.json({ section: 'syncs', action: 'bulk-sync' })
);
router.get('/syncs/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'syncs', action: 'history' })
);

// Mappings (4)
router.get('/mappings', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'list' })
);
router.get('/mappings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'detail' })
);
router.post('/mappings', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'create' })
);
router.put('/mappings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'update' })
);

// Conflicts (4)
router.get('/conflicts', (_req: Request, res: Response) =>
  res.json({ section: 'conflicts', action: 'list' })
);
router.get('/conflicts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'conflicts', action: 'detail' })
);
router.post('/conflicts/:id/resolve', (_req: Request, res: Response) =>
  res.json({ section: 'conflicts', action: 'resolve' })
);
router.post('/conflicts/auto-resolve', (_req: Request, res: Response) =>
  res.json({ section: 'conflicts', action: 'auto-resolve' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/sync-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'sync-rate' })
);
router.get('/analytics/error-frequency', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'error-frequency' })
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

