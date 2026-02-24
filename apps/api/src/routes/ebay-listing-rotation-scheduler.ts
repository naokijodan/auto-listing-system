import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-rotations', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-rotations' }));
router.get('/dashboard/upcoming', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'upcoming' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));

// Rotations (6)
router.get('/rotations/list', (_req: Request, res: Response) => res.json({ section: 'rotations', action: 'list' }));
router.get('/rotations/detail', (_req: Request, res: Response) => res.json({ section: 'rotations', action: 'detail' }));
router.post('/rotations/create', (_req: Request, res: Response) => res.json({ section: 'rotations', action: 'create' }));
router.put('/rotations/update', (_req: Request, res: Response) => res.json({ section: 'rotations', action: 'update' }));
router.post('/rotations/activate', (_req: Request, res: Response) => res.json({ section: 'rotations', action: 'activate' }));
router.post('/rotations/deactivate', (_req: Request, res: Response) => res.json({ section: 'rotations', action: 'deactivate' }));

// Schedules (4)
router.get('/schedules/list', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.get('/schedules/detail', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'detail' }));
router.post('/schedules/create', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/update', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));

// Listings (4)
router.get('/listings/list', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/detail', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/assign', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'assign' }));
router.post('/listings/unassign', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'unassign' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/rotation-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'rotation-impact' }));
router.get('/analytics/optimal-times', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'optimal-times' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

