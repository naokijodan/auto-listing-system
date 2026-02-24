import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/help', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'help' }));

// inventory (6)
router.get('/inventory/overview', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'overview' }));
router.get('/inventory/in-stock', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'in-stock' }));
router.get('/inventory/low-stock', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'low-stock' }));
router.get('/inventory/allocations', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'allocations' }));
router.get('/inventory/adjustments', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'adjustments' }));
router.get('/inventory/bulk', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'bulk' }));

// locations (4)
router.get('/locations/overview', (_req: Request, res: Response) => res.json({ section: 'locations', action: 'overview' }));
router.get('/locations/list', (_req: Request, res: Response) => res.json({ section: 'locations', action: 'list' }));
router.get('/locations/add', (_req: Request, res: Response) => res.json({ section: 'locations', action: 'add' }));
router.get('/locations/capacity', (_req: Request, res: Response) => res.json({ section: 'locations', action: 'capacity' }));

// sync (4)
router.get('/sync/overview', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'overview' }));
router.get('/sync/rules', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'rules' }));
router.get('/sync/run', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'run' }));
router.get('/sync/history', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'history' }));

// analytics (3)
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));
router.get('/analytics/reports', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'reports' }));

// settings (2)
router.get('/settings/general', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'general' }));
router.get('/settings/permissions', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'permissions' }));

// utilities (4)
router.get('/utilities/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/utilities/cache', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'cache' }));
router.get('/utilities/logs', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'logs' }));
router.get('/utilities/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));

export default router;

