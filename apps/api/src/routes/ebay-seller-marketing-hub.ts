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
router.get('/dashboard/campaigns', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'campaigns' })
);
router.get('/dashboard/budget', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'budget' })
);
router.get('/dashboard/roi', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'roi' })
);

// Campaigns (6)
router.get('/campaigns/list', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'list' })
);
router.get('/campaigns/detail', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'detail' })
);
router.get('/campaigns/create', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'create' })
);
router.get('/campaigns/launch', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'launch' })
);
router.get('/campaigns/pause', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'pause' })
);
router.get('/campaigns/history', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'history' })
);

// Audiences (4)
router.get('/audiences/list', (_req: Request, res: Response) =>
  res.json({ section: 'audiences', action: 'list' })
);
router.get('/audiences/detail', (_req: Request, res: Response) =>
  res.json({ section: 'audiences', action: 'detail' })
);
router.get('/audiences/create', (_req: Request, res: Response) =>
  res.json({ section: 'audiences', action: 'create' })
);
router.get('/audiences/segment', (_req: Request, res: Response) =>
  res.json({ section: 'audiences', action: 'segment' })
);

// Creatives (4)
router.get('/creatives/list', (_req: Request, res: Response) =>
  res.json({ section: 'creatives', action: 'list' })
);
router.get('/creatives/detail', (_req: Request, res: Response) =>
  res.json({ section: 'creatives', action: 'detail' })
);
router.get('/creatives/create', (_req: Request, res: Response) =>
  res.json({ section: 'creatives', action: 'create' })
);
router.get('/creatives/test', (_req: Request, res: Response) =>
  res.json({ section: 'creatives', action: 'test' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/campaign-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'campaign-performance' })
);
router.get('/analytics/audience-engagement', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'audience-engagement' })
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

