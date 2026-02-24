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
router.get('/dashboard/graded', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'graded' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/distribution', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'distribution' })
);

// Products (6)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/:id/grade', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'grade' })
);
router.post('/products/:id/regrade', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'regrade' })
);
router.post('/products/bulk-grade', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'bulk-grade' })
);
router.get('/products/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'history' })
);

// Criteria (4)
router.get('/criteria', (_req: Request, res: Response) =>
  res.json({ section: 'criteria', action: 'list' })
);
router.get('/criteria/:id', (_req: Request, res: Response) =>
  res.json({ section: 'criteria', action: 'detail' })
);
router.post('/criteria', (_req: Request, res: Response) =>
  res.json({ section: 'criteria', action: 'create' })
);
router.put('/criteria/:id', (_req: Request, res: Response) =>
  res.json({ section: 'criteria', action: 'update' })
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
router.post('/templates/:id/apply', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'apply' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/grade-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'grade-distribution' })
);
router.get('/analytics/accuracy', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'accuracy' })
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

