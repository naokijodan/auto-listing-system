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
router.get('/dashboard/batches', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'batches' })
);
router.get('/dashboard/processing', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'processing' })
);
router.get('/dashboard/completed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'completed' })
);

// Batches (6)
router.get('/batches/list', (_req: Request, res: Response) =>
  res.json({ section: 'batches', action: 'list' })
);
router.get('/batches/detail', (_req: Request, res: Response) =>
  res.json({ section: 'batches', action: 'detail' })
);
router.get('/batches/create', (_req: Request, res: Response) =>
  res.json({ section: 'batches', action: 'create' })
);
router.get('/batches/process', (_req: Request, res: Response) =>
  res.json({ section: 'batches', action: 'process' })
);
router.get('/batches/cancel', (_req: Request, res: Response) =>
  res.json({ section: 'batches', action: 'cancel' })
);
router.get('/batches/history', (_req: Request, res: Response) =>
  res.json({ section: 'batches', action: 'history' })
);

// Templates (4)
router.get('/templates/list', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'list' })
);
router.get('/templates/detail', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'detail' })
);
router.get('/templates/create', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'create' })
);
router.get('/templates/apply', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'apply' })
);

// Queues (4)
router.get('/queues/list', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'list' })
);
router.get('/queues/detail', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'detail' })
);
router.get('/queues/priority', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'priority' })
);
router.get('/queues/retry', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'retry' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/processing-speed', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'processing-speed' })
);
router.get('/analytics/error-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'error-rate' })
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

