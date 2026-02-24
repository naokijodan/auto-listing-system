import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/allocations', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'allocations' }));
router.get('/dashboard/channels', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'channels' }));
router.get('/dashboard/efficiency', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'efficiency' }));

// Allocations (6)
router.get('/allocations/list', (_req: Request, res: Response) => res.json({ section: 'allocations', action: 'list' }));
router.get('/allocations/detail', (_req: Request, res: Response) => res.json({ section: 'allocations', action: 'detail' }));
router.post('/allocations/create', (_req: Request, res: Response) => res.json({ section: 'allocations', action: 'create' }));
router.put('/allocations/update', (_req: Request, res: Response) => res.json({ section: 'allocations', action: 'update' }));
router.post('/allocations/optimize', (_req: Request, res: Response) => res.json({ section: 'allocations', action: 'optimize' }));
router.post('/allocations/bulk-allocate', (_req: Request, res: Response) => res.json({ section: 'allocations', action: 'bulk-allocate' }));

// Channels (4)
router.get('/channels/list', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'list' }));
router.get('/channels/detail', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'detail' }));
router.post('/channels/configure', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'configure' }));
router.post('/channels/sync', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'sync' }));

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/detail', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/update', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/allocation-efficiency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'allocation-efficiency' }));
router.get('/analytics/stockout-prevention', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'stockout-prevention' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

