import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/sync-status', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'sync-status' }));
router.get('/dashboard/issues', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'issues' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/:id/update', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.post('/products/:id/delete', (_req: Request, res: Response) => res.json({ section: 'products', action: 'delete' }));
router.post('/products/bulk-update', (_req: Request, res: Response) => res.json({ section: 'products', action: 'bulk-update' }));
router.post('/products/import', (_req: Request, res: Response) => res.json({ section: 'products', action: 'import' }));

// Channels (4)
router.get('/channels', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'list' }));
router.get('/channels/:id', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'detail' }));
router.get('/channels/:id/status', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'status' }));
router.get('/channels/:id/config', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'config' }));

// Syncs (4)
router.get('/syncs', (_req: Request, res: Response) => res.json({ section: 'syncs', action: 'list' }));
router.get('/syncs/status', (_req: Request, res: Response) => res.json({ section: 'syncs', action: 'status' }));
router.post('/syncs/trigger', (_req: Request, res: Response) => res.json({ section: 'syncs', action: 'trigger' }));
router.get('/syncs/history', (_req: Request, res: Response) => res.json({ section: 'syncs', action: 'history' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
router.get('/analytics/channel-comparison', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'channel-comparison' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

