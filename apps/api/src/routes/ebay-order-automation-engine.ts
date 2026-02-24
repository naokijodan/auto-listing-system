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
router.get('/dashboard/automated', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'automated' })
);
router.get('/dashboard/manual', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'manual' })
);
router.get('/dashboard/errors', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'errors' })
);

// Workflows (6)
router.get('/workflows/list', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'list' })
);
router.get('/workflows/detail', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'detail' })
);
router.post('/workflows/create', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'create' })
);
router.put('/workflows/update', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'update' })
);
router.post('/workflows/activate', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'activate' })
);
router.get('/workflows/history', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'history' })
);

// Triggers (4)
router.get('/triggers/list', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'list' })
);
router.get('/triggers/detail', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'detail' })
);
router.post('/triggers/create', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'create' })
);
router.post('/triggers/test', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'test' })
);

// Actions (4)
router.get('/actions/list', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'list' })
);
router.get('/actions/detail', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'detail' })
);
router.post('/actions/create', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'create' })
);
router.put('/actions/configure', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'configure' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/automation-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'automation-rate' })
);
router.get('/analytics/time-saved', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'time-saved' })
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

