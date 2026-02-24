import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/cost-trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'cost-trends' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/recommendations', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recommendations' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.get('/inventory/costs', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'costs' }));
router.get('/inventory/slow-moving', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'slow-moving' }));
router.get('/inventory/overstock', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'overstock' }));
router.get('/inventory/reorder', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'reorder' }));

// Costs (4)
router.get('/costs/breakdown', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'breakdown' }));
router.get('/costs/history', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'history' }));
router.get('/costs/forecast', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'forecast' }));
router.post('/costs/recalculate', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'recalculate' }));

// Optimization (4)
router.get('/optimization/opportunities', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'opportunities' }));
router.post('/optimization/run', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'run' }));
router.post('/optimization/apply', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'apply' }));
router.get('/optimization/history', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'history' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/cost-per-sku', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'cost-per-sku' }));
router.get('/analytics/savings', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'savings' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

