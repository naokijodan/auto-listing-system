import { Router } from 'express'; import type { Request, Response } from 'express';

const router = Router();

// Phase 613: 在庫サイクルカウンター — Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'root' }));
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/stats', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'stats' }));
router.get('/dashboard/recent-activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent-activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'summary' }));
router.get('/inventory/low-stock', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'low-stock' }));
router.get('/inventory/restock', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'restock' }));
router.get('/inventory/movements', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'movements' }));
router.get('/inventory/locations', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'locations' }));
router.post('/inventory/adjustments', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'adjustments' }));

// Counts (4)
router.get('/counts', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'list' }));
router.post('/counts/start', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'start' }));
router.post('/counts/pause', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'pause' }));
router.post('/counts/reconcile', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'reconcile' }));

// Schedules (4)
router.get('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.post('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));
router.delete('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'delete' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/cycle-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'cycle-time' }));
router.get('/analytics/accuracy', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'accuracy' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

