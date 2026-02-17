import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Theme: indigo-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/summary' }));
router.get('/dashboard/channels', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/channels' }));
router.get('/dashboard/sync-status', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/sync-status' }));
router.get('/dashboard/errors', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/errors' }));

// Channels (6): CRUD + connect + sync (6 endpoints)
router.get('/channels', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'list' }));
router.post('/channels', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'create' }));
router.get('/channels/:id', (req: Request, res: Response) => res.json({ section: 'channels', action: 'detail', id: req.params.id }));
router.put('/channels/:id', (req: Request, res: Response) => res.json({ section: 'channels', action: 'update', id: req.params.id }));
router.post('/channels/:id/connect', (req: Request, res: Response) => res.json({ section: 'channels', action: 'connect', id: req.params.id }));
router.post('/channels/:id/sync', (req: Request, res: Response) => res.json({ section: 'channels', action: 'sync', id: req.params.id }));

// Mappings (4)
router.get('/mappings', (_req: Request, res: Response) => res.json({ section: 'mappings', route: '/mappings' }));
router.get('/mappings/:id', (req: Request, res: Response) => res.json({ section: 'mappings', route: '/mappings/:id', id: req.params.id }));
router.post('/mappings/create', (_req: Request, res: Response) => res.json({ section: 'mappings', route: '/mappings/create' }));
router.post('/mappings/auto', (_req: Request, res: Response) => res.json({ section: 'mappings', route: '/mappings/auto' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', route: '/rules' }));
router.get('/rules/:id', (req: Request, res: Response) => res.json({ section: 'rules', route: '/rules/:id', id: req.params.id }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', route: '/rules/create' }));
router.post('/rules/priority', (_req: Request, res: Response) => res.json({ section: 'rules', route: '/rules/priority' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/performance' }));
router.get('/analytics/conflicts', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/conflicts' }));

// Settings (2) GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ util: 'health', status: 'ok' }));
router.post('/export', (_req: Request, res: Response) => res.json({ util: 'export', status: 'queued' }));
router.post('/import', (_req: Request, res: Response) => res.json({ util: 'import', status: 'queued' }));
router.post('/force-sync', (_req: Request, res: Response) => res.json({ util: 'force-sync', status: 'started' }));

export default router;

