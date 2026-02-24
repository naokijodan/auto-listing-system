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
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/in-progress', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'in-progress' })
);
router.get('/dashboard/completed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'completed' })
);

// Migrations (6)
router.get('/migrations/list', (_req: Request, res: Response) =>
  res.json({ section: 'migrations', action: 'list' })
);
router.get('/migrations/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'migrations', action: 'detail' })
);
router.post('/migrations/create', (_req: Request, res: Response) =>
  res.json({ section: 'migrations', action: 'create' })
);
router.post('/migrations/start/:id', (_req: Request, res: Response) =>
  res.json({ section: 'migrations', action: 'start' })
);
router.post('/migrations/pause/:id', (_req: Request, res: Response) =>
  res.json({ section: 'migrations', action: 'pause' })
);
router.post('/migrations/resume/:id', (_req: Request, res: Response) =>
  res.json({ section: 'migrations', action: 'resume' })
);

// Sources (4)
router.get('/sources/list', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'list' })
);
router.get('/sources/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'detail' })
);
router.post('/sources/connect', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'connect' })
);
router.post('/sources/disconnect/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'disconnect' })
);

// Mappings (4)
router.get('/mappings/list', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'list' })
);
router.get('/mappings/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'detail' })
);
router.post('/mappings/create', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'create' })
);
router.put('/mappings/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/success-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'success-rate' })
);
router.get('/analytics/errors', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'errors' })
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
router.post('/validate', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'validate' })
);

export default router;

