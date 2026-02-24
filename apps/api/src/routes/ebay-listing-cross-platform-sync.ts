import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/queue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'queue' }));
router.get('/dashboard/completed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'completed' }));
router.get('/dashboard/failed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'failed' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.post('/listings/:id/sync', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'sync' }));
router.post('/listings/bulk-sync', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-sync' }));

// Platforms (4)
router.get('/platforms', (_req: Request, res: Response) => res.json({ section: 'platforms', action: 'list' }));
router.get('/platforms/:id', (_req: Request, res: Response) => res.json({ section: 'platforms', action: 'detail' }));
router.post('/platforms/connect', (_req: Request, res: Response) => res.json({ section: 'platforms', action: 'connect' }));
router.post('/platforms/disconnect', (_req: Request, res: Response) => res.json({ section: 'platforms', action: 'disconnect' }));

// Sync (4)
router.post('/sync/start', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'start' }));
router.get('/sync/status', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'status' }));
router.post('/sync/resolve', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'resolve' }));
router.get('/sync/history', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'history' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/sync-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sync-rate' }));
router.get('/analytics/latency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'latency' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/cleanup', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'cleanup' }));

export default router;

