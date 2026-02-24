import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'root' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/popular', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'popular' })
);
router.get('/dashboard/recent', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'recent' })
);
router.get('/dashboard/performance', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'performance' })
);

// Templates (6)
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
router.post('/templates/:id/duplicate', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'duplicate' })
);
router.get('/templates/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'history' })
);

// Categories (4)
router.get('/categories', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'list' })
);
router.get('/categories/:id', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'detail' })
);
router.post('/categories', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'create' })
);
router.post('/categories/organize', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'organize' })
);

// Variables (4)
router.get('/variables', (_req: Request, res: Response) =>
  res.json({ section: 'variables', action: 'list' })
);
router.get('/variables/:id', (_req: Request, res: Response) =>
  res.json({ section: 'variables', action: 'detail' })
);
router.post('/variables', (_req: Request, res: Response) =>
  res.json({ section: 'variables', action: 'create' })
);
router.post('/variables/test', (_req: Request, res: Response) =>
  res.json({ section: 'variables', action: 'test' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/usage-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'usage-trend' })
);
router.get('/analytics/conversion-by-template', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'conversion-by-template' })
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

