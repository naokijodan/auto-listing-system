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
router.get('/dashboard/splits', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'splits' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/shipped', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'shipped' })
);

// Splits (6)
router.get('/splits', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'list' })
);
router.get('/splits/:id', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'detail' })
);
router.post('/splits', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'create' })
);
router.post('/splits/ship', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'ship' })
);
router.get('/splits/track', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'track' })
);
router.post('/splits/merge', (_req: Request, res: Response) =>
  res.json({ section: 'splits', action: 'merge' })
);

// Packages (4)
router.get('/packages', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'list' })
);
router.get('/packages/:id', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'detail' })
);
router.post('/packages', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'create' })
);
router.post('/packages/label', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'label' })
);

// Rules (4)
router.get('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.post('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.put('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/split-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'split-rate' })
);
router.get('/analytics/shipping-cost', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'shipping-cost' })
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

