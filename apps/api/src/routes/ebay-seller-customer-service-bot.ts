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
router.get('/dashboard/conversations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'conversations' })
);
router.get('/dashboard/resolved', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'resolved' })
);
router.get('/dashboard/escalated', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'escalated' })
);

// Conversations (6)
router.get('/conversations', (_req: Request, res: Response) =>
  res.json({ section: 'conversations', action: 'list' })
);
router.get('/conversations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'conversations', action: 'detail' })
);
router.post('/conversations', (_req: Request, res: Response) =>
  res.json({ section: 'conversations', action: 'create' })
);
router.post('/conversations/:id/respond', (_req: Request, res: Response) =>
  res.json({ section: 'conversations', action: 'respond' })
);
router.post('/conversations/:id/close', (_req: Request, res: Response) =>
  res.json({ section: 'conversations', action: 'close' })
);
router.get('/conversations/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'conversations', action: 'history' })
);

// Templates (4)
router.get('/templates', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'list' })
);
router.get('/templates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'detail' })
);
router.post('/templates', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'create' })
);
router.put('/templates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'update' })
);

// Automations (4)
router.get('/automations', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'list' })
);
router.get('/automations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'detail' })
);
router.post('/automations', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'create' })
);
router.post('/automations/:id/toggle', (_req: Request, res: Response) =>
  res.json({ section: 'automations', action: 'toggle' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/response-time', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'response-time' })
);
router.get('/analytics/satisfaction-score', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'satisfaction-score' })
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

