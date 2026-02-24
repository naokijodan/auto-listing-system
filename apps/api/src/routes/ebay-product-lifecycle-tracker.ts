import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'index' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active' }));
router.get('/dashboard/declining', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'declining' }));
router.get('/dashboard/end-of-life', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'end-of-life' }));

// Products (6)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/classify', (_req: Request, res: Response) => res.json({ section: 'products', action: 'classify' }));
router.get('/products/transition', (_req: Request, res: Response) => res.json({ section: 'products', action: 'transition' }));
router.get('/products/archive', (_req: Request, res: Response) => res.json({ section: 'products', action: 'archive' }));
router.get('/products/history', (_req: Request, res: Response) => res.json({ section: 'products', action: 'history' }));

// Stages (4)
router.get('/stages/list', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'list' }));
router.get('/stages/detail', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'detail' }));
router.get('/stages/configure', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'configure' }));
router.get('/stages/monitor', (_req: Request, res: Response) => res.json({ section: 'stages', action: 'monitor' }));

// Actions (4)
router.get('/actions/list', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'list' }));
router.get('/actions/detail', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'detail' }));
router.get('/actions/create', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'create' }));
router.get('/actions/execute', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'execute' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'index' }));
router.get('/analytics/lifecycle-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'lifecycle-distribution' }));
router.get('/analytics/stage-duration', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'stage-duration' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.get('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

