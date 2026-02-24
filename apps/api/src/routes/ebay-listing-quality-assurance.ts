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
router.get('/dashboard/passed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'passed' })
);
router.get('/dashboard/failed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'failed' })
);
router.get('/dashboard/warnings', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'warnings' })
);

// Checks (6)
router.get('/checks', (_req: Request, res: Response) =>
  res.json({ section: 'checks', action: 'list' })
);
router.get('/checks/:id', (_req: Request, res: Response) =>
  res.json({ section: 'checks', action: 'detail' })
);
router.post('/checks/run', (_req: Request, res: Response) =>
  res.json({ section: 'checks', action: 'run' })
);
router.post('/checks/bulk-run', (_req: Request, res: Response) =>
  res.json({ section: 'checks', action: 'bulk-run' })
);
router.post('/checks/schedule', (_req: Request, res: Response) =>
  res.json({ section: 'checks', action: 'schedule' })
);
router.get('/checks/history', (_req: Request, res: Response) =>
  res.json({ section: 'checks', action: 'history' })
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

// Issues (4)
router.get('/issues', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'list' })
);
router.get('/issues/:id', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'detail' })
);
router.post('/issues/:id/fix', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'fix' })
);
router.post('/issues/bulk-fix', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'bulk-fix' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/quality-score', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'quality-score' })
);
router.get('/analytics/issue-trends', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'issue-trends' })
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

