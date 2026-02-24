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
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/generated', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'generated' })
);
router.get('/dashboard/cost', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'cost' })
);

// Labels (6)
router.get('/labels', (_req: Request, res: Response) =>
  res.json({ section: 'labels', action: 'list' })
);
router.get('/labels/:id', (_req: Request, res: Response) =>
  res.json({ section: 'labels', action: 'detail' })
);
router.post('/labels', (_req: Request, res: Response) =>
  res.json({ section: 'labels', action: 'create' })
);
router.post('/labels/:id/print', (_req: Request, res: Response) =>
  res.json({ section: 'labels', action: 'print' })
);
router.post('/labels/:id/void', (_req: Request, res: Response) =>
  res.json({ section: 'labels', action: 'void' })
);
router.post('/labels/bulk-generate', (_req: Request, res: Response) =>
  res.json({ section: 'labels', action: 'bulk-generate' })
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

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'list' })
);
router.get('/carriers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'detail' })
);
router.get('/carriers/:id/rates', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'rates' })
);
router.get('/carriers/preferences', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'preferences' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/usage', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'usage' })
);
router.get('/analytics/cost-savings', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'cost-savings' })
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

