import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/stages', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'stages' }));
router.get('/dashboard/transitions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'transitions' }));
router.get('/dashboard/end-of-life', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'end-of-life' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.put('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.post('/products/:id/transition', (_req: Request, res: Response) => res.json({ section: 'products', action: 'transition' }));
router.post('/products/:id/archive', (_req: Request, res: Response) => res.json({ section: 'products', action: 'archive' }));

// Lifecycle (4)
router.get('/lifecycle', (_req: Request, res: Response) => res.json({ section: 'lifecycle', action: 'list' }));
router.get('/lifecycle/:id', (_req: Request, res: Response) => res.json({ section: 'lifecycle', action: 'detail' }));
router.post('/lifecycle', (_req: Request, res: Response) => res.json({ section: 'lifecycle', action: 'create' }));
router.put('/lifecycle/:id', (_req: Request, res: Response) => res.json({ section: 'lifecycle', action: 'update' }));

// Stages (4)
router.get('/stages', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'list' }));
router.get('/stages/:id', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'detail' }));
router.post('/stages', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'create' }));
router.put('/stages/:id', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/lifecycle-duration', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'lifecycle-duration' }));
router.get('/analytics/stage-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'stage-distribution' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
