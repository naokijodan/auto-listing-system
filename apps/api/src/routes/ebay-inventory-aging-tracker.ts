import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/aging-buckets', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'aging-buckets' }));
router.get('/dashboard/at-risk', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'at-risk' }));
router.get('/dashboard/stale', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'stale' }));

// Items (6)
router.get('/items/list', (_req: Request, res: Response) => res.json({ section: 'items', action: 'list' }));
router.get('/items/detail', (_req: Request, res: Response) => res.json({ section: 'items', action: 'detail' }));
router.get('/items/age-history', (_req: Request, res: Response) => res.json({ section: 'items', action: 'age-history' }));
router.post('/items/markdown', (_req: Request, res: Response) => res.json({ section: 'items', action: 'markdown' }));
router.post('/items/bulk-markdown', (_req: Request, res: Response) => res.json({ section: 'items', action: 'bulk-markdown' }));
router.post('/items/liquidate', (_req: Request, res: Response) => res.json({ section: 'items', action: 'liquidate' }));

// Buckets (4)
router.get('/buckets/list', (_req: Request, res: Response) => res.json({ section: 'buckets', action: 'list' }));
router.get('/buckets/detail', (_req: Request, res: Response) => res.json({ section: 'buckets', action: 'detail' }));
router.post('/buckets/create', (_req: Request, res: Response) => res.json({ section: 'buckets', action: 'create' }));
router.put('/buckets/update', (_req: Request, res: Response) => res.json({ section: 'buckets', action: 'update' }));

// Actions (4)
router.get('/actions/list', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'list' }));
router.get('/actions/detail', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'detail' }));
router.post('/actions/create', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'create' }));
router.post('/actions/execute', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'execute' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/aging-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'aging-trend' }));
router.get('/analytics/holding-cost', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'holding-cost' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

