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
router.get('/dashboard/imports', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'imports' })
);
router.get('/dashboard/errors', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'errors' })
);
router.get('/dashboard/queue', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'queue' })
);

// Imports (6)
router.get('/imports', (_req: Request, res: Response) =>
  res.json({ section: 'imports', action: 'list' })
);
router.get('/imports/:id', (_req: Request, res: Response) =>
  res.json({ section: 'imports', action: 'detail' })
);
router.post('/imports', (_req: Request, res: Response) =>
  res.json({ section: 'imports', action: 'create' })
);
router.post('/imports/validate', (_req: Request, res: Response) =>
  res.json({ section: 'imports', action: 'validate' })
);
router.post('/imports/execute', (_req: Request, res: Response) =>
  res.json({ section: 'imports', action: 'execute' })
);
router.post('/imports/cancel', (_req: Request, res: Response) =>
  res.json({ section: 'imports', action: 'cancel' })
);

// Mappings (4)
router.get('/mappings', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'list' })
);
router.get('/mappings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'detail' })
);
router.post('/mappings', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'create' })
);
router.put('/mappings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'update' })
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
router.post('/templates/apply', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'apply' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/success-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'success-rate' })
);
router.get('/analytics/processing-time', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'processing-time' })
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

