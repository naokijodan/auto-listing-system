import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Theme: lime-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'list' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/recent', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'recent' })
);
router.get('/dashboard/metrics', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'metrics' })
);
router.get('/dashboard/channels', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'channels' })
);

// Messages (6): CRUD + send + bulk-send
router.get('/messages', (_req: Request, res: Response) =>
  res.json({ section: 'messages', action: 'list' })
);
router.get('/messages/:id', (_req: Request, res: Response) =>
  res.json({ section: 'messages', action: 'detail' })
);
router.post('/messages/create', (_req: Request, res: Response) =>
  res.json({ section: 'messages', action: 'create' })
);
router.put('/messages/:id', (_req: Request, res: Response) =>
  res.json({ section: 'messages', action: 'update' })
);
router.post('/messages/:id/send', (_req: Request, res: Response) =>
  res.json({ section: 'messages', action: 'send' })
);
router.post('/messages/bulk-send', (_req: Request, res: Response) =>
  res.json({ section: 'messages', action: 'bulk-send' })
);

// Templates (4): list, detail, create, update
router.get('/templates', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'list' })
);
router.get('/templates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'detail' })
);
router.post('/templates/create', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'create' })
);
router.put('/templates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'update' })
);

// Automations (4): list, detail, create, update
router.get('/automations', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'list' })
);
router.get('/automations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'detail' })
);
router.post('/automations/create', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'create' })
);
router.put('/automations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/response-time', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'response-time' })
);
router.get('/analytics/satisfaction', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'satisfaction' })
);

// Settings (2) GET/PUT
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

