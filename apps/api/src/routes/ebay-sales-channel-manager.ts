import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/channels', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'channels' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));
router.get('/dashboard/sync-status', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'sync-status' }));

// Channels (6)
router.get('/channels/list', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'list' }));
router.get('/channels/detail', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'detail' }));
router.post('/channels/create', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'create' }));
router.put('/channels/update', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'update' }));
router.post('/channels/activate', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'activate' }));
router.post('/channels/deactivate', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'deactivate' }));

// Products (4)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/assign', (_req: Request, res: Response) => res.json({ section: 'products', action: 'assign' }));
router.post('/products/unassign', (_req: Request, res: Response) => res.json({ section: 'products', action: 'unassign' }));

// Sync (4)
router.get('/sync/list', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'list' }));
router.get('/sync/detail', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'detail' }));
router.post('/sync/run', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'run' }));
router.post('/sync/schedule', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'schedule' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/channel-comparison', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'channel-comparison' }));
router.get('/analytics/revenue-split', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-split' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

