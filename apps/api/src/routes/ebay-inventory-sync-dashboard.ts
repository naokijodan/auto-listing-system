import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/synced', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'synced' }));
router.get('/dashboard/out-of-sync', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'out-of-sync' }));
router.get('/dashboard/errors', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'errors' }));

// Channels (6)
router.get('/channels', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'list' }));
router.get('/channels/:id', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'detail' }));
router.post('/channels/connect', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'connect' }));
router.post('/channels/:id/disconnect', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'disconnect' }));
router.post('/channels/:id/sync', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'sync' }));
router.get('/channels/:id/history', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'history' }));

// Jobs (4)
router.get('/jobs', (_req: Request, res: Response) => res.json({ section: 'jobs', action: 'list' }));
router.get('/jobs/:id', (_req: Request, res: Response) => res.json({ section: 'jobs', action: 'detail' }));
router.post('/jobs', (_req: Request, res: Response) => res.json({ section: 'jobs', action: 'trigger' }));
router.post('/jobs/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'jobs', action: 'cancel' }));

// Conflicts (4)
router.get('/conflicts', (_req: Request, res: Response) => res.json({ section: 'conflicts', action: 'list' }));
router.get('/conflicts/:id', (_req: Request, res: Response) => res.json({ section: 'conflicts', action: 'detail' }));
router.post('/conflicts/:id/resolve', (_req: Request, res: Response) => res.json({ section: 'conflicts', action: 'resolve' }));
router.post('/conflicts/auto-resolve', (_req: Request, res: Response) => res.json({ section: 'conflicts', action: 'auto-resolve' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/sync-frequency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sync-frequency' }));
router.get('/analytics/error-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'error-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

