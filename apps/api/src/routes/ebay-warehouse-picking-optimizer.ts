import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/queue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'queue' }));
router.get('/dashboard/in-progress', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'in-progress' }));
router.get('/dashboard/completed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'completed' }));

// PickLists (6)
router.get('/picklists', (_req: Request, res: Response) => res.json({ section: 'picklists', action: 'list' }));
router.get('/picklists/:id', (_req: Request, res: Response) => res.json({ section: 'picklists', action: 'detail' }));
router.post('/picklists', (_req: Request, res: Response) => res.json({ section: 'picklists', action: 'create' }));
router.post('/picklists/:id/optimize', (_req: Request, res: Response) => res.json({ section: 'picklists', action: 'optimize' }));
router.post('/picklists/:id/assign', (_req: Request, res: Response) => res.json({ section: 'picklists', action: 'assign' }));
router.post('/picklists/:id/complete', (_req: Request, res: Response) => res.json({ section: 'picklists', action: 'complete' }));

// Zones (4)
router.get('/zones', (_req: Request, res: Response) => res.json({ section: 'zones', action: 'list' }));
router.get('/zones/:id', (_req: Request, res: Response) => res.json({ section: 'zones', action: 'detail' }));
router.post('/zones', (_req: Request, res: Response) => res.json({ section: 'zones', action: 'create' }));
router.put('/zones/:id', (_req: Request, res: Response) => res.json({ section: 'zones', action: 'update' }));

// Workers (4)
router.get('/workers', (_req: Request, res: Response) => res.json({ section: 'workers', action: 'list' }));
router.get('/workers/:id', (_req: Request, res: Response) => res.json({ section: 'workers', action: 'detail' }));
router.post('/workers/:id/assign', (_req: Request, res: Response) => res.json({ section: 'workers', action: 'assign' }));
router.get('/workers/:id/performance', (_req: Request, res: Response) => res.json({ section: 'workers', action: 'performance' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/pick-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'pick-rate' }));
router.get('/analytics/efficiency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'efficiency' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

