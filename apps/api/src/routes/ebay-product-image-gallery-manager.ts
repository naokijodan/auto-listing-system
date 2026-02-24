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
router.get('/dashboard/galleries', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'galleries' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/storage', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'storage' })
);

// Galleries (6)
router.get('/galleries', (_req: Request, res: Response) =>
  res.json({ section: 'galleries', action: 'list' })
);
router.get('/galleries/:id', (_req: Request, res: Response) =>
  res.json({ section: 'galleries', action: 'detail' })
);
router.post('/galleries', (_req: Request, res: Response) =>
  res.json({ section: 'galleries', action: 'create' })
);
router.put('/galleries/:id', (_req: Request, res: Response) =>
  res.json({ section: 'galleries', action: 'update' })
);
router.delete('/galleries/:id', (_req: Request, res: Response) =>
  res.json({ section: 'galleries', action: 'delete' })
);
router.post('/galleries/:id/reorder', (_req: Request, res: Response) =>
  res.json({ section: 'galleries', action: 'reorder' })
);

// Images (4)
router.get('/images', (_req: Request, res: Response) =>
  res.json({ section: 'images', action: 'list' })
);
router.get('/images/:id', (_req: Request, res: Response) =>
  res.json({ section: 'images', action: 'detail' })
);
router.post('/images/upload', (_req: Request, res: Response) =>
  res.json({ section: 'images', action: 'upload' })
);
router.post('/images/:id/optimize', (_req: Request, res: Response) =>
  res.json({ section: 'images', action: 'optimize' })
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
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/image-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'image-performance' })
);
router.get('/analytics/storage-usage', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'storage-usage' })
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

