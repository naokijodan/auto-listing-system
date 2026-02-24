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
router.get('/dashboard/connected', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'connected' })
);
router.get('/dashboard/posts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'posts' })
);
router.get('/dashboard/engagement', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'engagement' })
);

// Platforms (6)
router.get('/platforms/list', (_req: Request, res: Response) =>
  res.json({ section: 'platforms', action: 'list' })
);
router.get('/platforms/detail', (_req: Request, res: Response) =>
  res.json({ section: 'platforms', action: 'detail' })
);
router.get('/platforms/connect', (_req: Request, res: Response) =>
  res.json({ section: 'platforms', action: 'connect' })
);
router.get('/platforms/disconnect', (_req: Request, res: Response) =>
  res.json({ section: 'platforms', action: 'disconnect' })
);
router.get('/platforms/sync', (_req: Request, res: Response) =>
  res.json({ section: 'platforms', action: 'sync' })
);
router.get('/platforms/history', (_req: Request, res: Response) =>
  res.json({ section: 'platforms', action: 'history' })
);

// Posts (4)
router.get('/posts/list', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'list' })
);
router.get('/posts/detail', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'detail' })
);
router.get('/posts/create', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'create' })
);
router.get('/posts/schedule', (_req: Request, res: Response) =>
  res.json({ section: 'posts', action: 'schedule' })
);

// Campaigns (4)
router.get('/campaigns/list', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'list' })
);
router.get('/campaigns/detail', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'detail' })
);
router.get('/campaigns/create', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'create' })
);
router.get('/campaigns/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'analyze' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/engagement-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'engagement-trend' })
);
router.get('/analytics/traffic-source', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'traffic-source' })
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

