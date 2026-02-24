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
router.get('/dashboard/flagged', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'flagged' })
);
router.get('/dashboard/confirmed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'confirmed' })
);
router.get('/dashboard/false-positives', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'false-positives' })
);

// Detections (6)
router.get('/detections', (_req: Request, res: Response) =>
  res.json({ section: 'detections', action: 'list' })
);
router.get('/detections/:id', (_req: Request, res: Response) =>
  res.json({ section: 'detections', action: 'detail' })
);
router.post('/detections/:id/flag', (_req: Request, res: Response) =>
  res.json({ section: 'detections', action: 'flag' })
);
router.post('/detections/:id/confirm', (_req: Request, res: Response) =>
  res.json({ section: 'detections', action: 'confirm' })
);
router.post('/detections/:id/dismiss', (_req: Request, res: Response) =>
  res.json({ section: 'detections', action: 'dismiss' })
);
router.get('/detections/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'detections', action: 'history' })
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

// Patterns (4)
router.get('/patterns', (_req: Request, res: Response) =>
  res.json({ section: 'patterns', action: 'list' })
);
router.get('/patterns/:id', (_req: Request, res: Response) =>
  res.json({ section: 'patterns', action: 'detail' })
);
router.get('/patterns/:id/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'patterns', action: 'analyze' })
);
router.post('/patterns/:id/report', (_req: Request, res: Response) =>
  res.json({ section: 'patterns', action: 'report' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/detection-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'detection-rate' })
);
router.get('/analytics/fraud-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'fraud-trend' })
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

