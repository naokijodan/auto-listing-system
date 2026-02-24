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
router.get('/dashboard/compliant', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'compliant' })
);
router.get('/dashboard/violations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'violations' })
);
router.get('/dashboard/warnings', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'warnings' })
);

// Listings (6)
router.get('/listings/list', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'list' })
);
router.get('/listings/detail', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'detail' })
);
router.get('/listings/check', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'check' })
);
router.get('/listings/fix', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'fix' })
);
router.get('/listings/bulk-check', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'bulk-check' })
);
router.get('/listings/history', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'history' })
);

// Policies (4)
router.get('/policies/list', (_req: Request, res: Response) =>
  res.json({ section: 'policies', action: 'list' })
);
router.get('/policies/detail', (_req: Request, res: Response) =>
  res.json({ section: 'policies', action: 'detail' })
);
router.get('/policies/update', (_req: Request, res: Response) =>
  res.json({ section: 'policies', action: 'update' })
);
router.get('/policies/validate', (_req: Request, res: Response) =>
  res.json({ section: 'policies', action: 'validate' })
);

// Violations (4)
router.get('/violations/list', (_req: Request, res: Response) =>
  res.json({ section: 'violations', action: 'list' })
);
router.get('/violations/detail', (_req: Request, res: Response) =>
  res.json({ section: 'violations', action: 'detail' })
);
router.get('/violations/resolve', (_req: Request, res: Response) =>
  res.json({ section: 'violations', action: 'resolve' })
);
router.get('/violations/appeal', (_req: Request, res: Response) =>
  res.json({ section: 'violations', action: 'appeal' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/compliance-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'compliance-trend' })
);
router.get('/analytics/violation-types', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'violation-types' })
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

