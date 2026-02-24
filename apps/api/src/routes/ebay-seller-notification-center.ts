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
router.get('/dashboard/unread', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'unread' })
);
router.get('/dashboard/important', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'important' })
);
router.get('/dashboard/archived', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'archived' })
);

// Notifications (6)
router.get('/notifications/list', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'list' })
);
router.get('/notifications/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'detail' })
);
router.post('/notifications/mark-read/:id', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'mark-read' })
);
router.post('/notifications/mark-unread/:id', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'mark-unread' })
);
router.post('/notifications/archive/:id', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'archive' })
);
router.delete('/notifications/delete/:id', (_req: Request, res: Response) =>
  res.json({ section: 'notifications', action: 'delete' })
);

// Channels (4)
router.get('/channels/list', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'list' })
);
router.get('/channels/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'detail' })
);
router.post('/channels/configure/:id', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'configure' })
);
router.post('/channels/test/:id', (_req: Request, res: Response) =>
  res.json({ section: 'channels', action: 'test' })
);

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.post('/rules/create', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.put('/rules/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/frequency', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'frequency' })
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
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

