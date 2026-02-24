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
router.get('/dashboard/trending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'trending' })
);
router.get('/dashboard/my-posts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'my-posts' })
);
router.get('/dashboard/notifications', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'notifications' })
);

// Posts (6)
router.get('/posts', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'list' })
);
router.get('/posts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'detail' })
);
router.post('/posts', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'create' })
);
router.put('/posts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'update' })
);
router.delete('/posts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'delete' })
);
router.post('/posts/:id/like', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'like' })
);

// Topics (4)
router.get('/topics', (_req: Request, res: Response) =>
  res.json({ section: 'topics', action: 'list' })
);
router.get('/topics/:id', (_req: Request, res: Response) =>
  res.json({ section: 'topics', action: 'detail' })
);
router.post('/topics', (_req: Request, res: Response) =>
  res.json({ section: 'topics', action: 'create' })
);
router.post('/topics/:id/follow', (_req: Request, res: Response) =>
  res.json({ section: 'topics', action: 'follow' })
);

// Members (4)
router.get('/members', (_req: Request, res: Response) =>
  res.json({ section: 'members', action: 'list' })
);
router.get('/members/:id', (_req: Request, res: Response) =>
  res.json({ section: 'members', action: 'detail' })
);
router.get('/members/:id/profile', (_req: Request, res: Response) =>
  res.json({ section: 'members', action: 'profile' })
);
router.get('/members/ranking', (_req: Request, res: Response) =>
  res.json({ section: 'members', action: 'ranking' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/engagement', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'engagement' })
);
router.get('/analytics/growth', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'growth' })
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

