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
router.get('/dashboard/compliant', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'compliant' })
);
router.get('/dashboard/non-compliant', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'non-compliant' })
);
router.get('/dashboard/deadlines', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'deadlines' })
);

// Filings (6)
router.get('/filings', (_req: Request, res: Response) =>
  res.json({ section: 'filings', action: 'list' })
);
router.get('/filings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'filings', action: 'detail' })
);
router.post('/filings', (_req: Request, res: Response) =>
  res.json({ section: 'filings', action: 'create' })
);
router.post('/filings/:id/submit', (_req: Request, res: Response) =>
  res.json({ section: 'filings', action: 'submit' })
);
router.post('/filings/:id/amend', (_req: Request, res: Response) =>
  res.json({ section: 'filings', action: 'amend' })
);
router.get('/filings/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'filings', action: 'history' })
);

// Jurisdictions (4)
router.get('/jurisdictions', (_req: Request, res: Response) =>
  res.json({ section: 'jurisdictions', action: 'list' })
);
router.get('/jurisdictions/:id', (_req: Request, res: Response) =>
  res.json({ section: 'jurisdictions', action: 'detail' })
);
router.post('/jurisdictions/:id/configure', (_req: Request, res: Response) =>
  res.json({ section: 'jurisdictions', action: 'configure' })
);
router.post('/jurisdictions/:id/validate', (_req: Request, res: Response) =>
  res.json({ section: 'jurisdictions', action: 'validate' })
);

// Documents (4)
router.get('/documents', (_req: Request, res: Response) =>
  res.json({ section: 'documents', action: 'list' })
);
router.get('/documents/:id', (_req: Request, res: Response) =>
  res.json({ section: 'documents', action: 'detail' })
);
router.post('/documents/upload', (_req: Request, res: Response) =>
  res.json({ section: 'documents', action: 'upload' })
);
router.get('/documents/:id/download', (_req: Request, res: Response) =>
  res.json({ section: 'documents', action: 'download' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/compliance-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'compliance-rate' })
);
router.get('/analytics/tax-liability', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'tax-liability' })
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

