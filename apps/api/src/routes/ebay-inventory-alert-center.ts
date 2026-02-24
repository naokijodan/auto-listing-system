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
router.get('/dashboard/active', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'active' })
);
router.get('/dashboard/resolved', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'resolved' })
);
router.get('/dashboard/critical', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'critical' })
);

// Alerts (6)
router.get('/alerts/list', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'list' })
);
router.get('/alerts/detail', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'detail' })
);
router.get('/alerts/create', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'create' })
);
router.get('/alerts/acknowledge', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'acknowledge' })
);
router.get('/alerts/resolve', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'resolve' })
);
router.get('/alerts/history', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'history' })
);

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/detail', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.get('/rules/create', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.get('/rules/update', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Notifications (4)
router.get('/notifications/list', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'list' })
);
router.get('/notifications/detail', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'detail' })
);
router.get('/notifications/configure', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'configure' })
);
router.get('/notifications/test', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'test' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/alert-frequency', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'alert-frequency' })
);
router.get('/analytics/response-time', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'response-time' })
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
router.get('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.get('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

