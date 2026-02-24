import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/liquidation-progress', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'liquidation-progress' }));
router.get('/dashboard/aging-inventory', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'aging-inventory' }));
router.get('/dashboard/impact', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'impact' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'create' }));
router.put('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'update' }));
router.post('/inventory/:id/mark-liquidation', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'mark-liquidation' }));
router.delete('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'delete' }));

// Liquidation (4)
router.get('/liquidation', (_req: Request, res: Response) => res.json({ section: 'liquidation', action: 'overview' }));
router.post('/liquidation/price-drop', (_req: Request, res: Response) => res.json({ section: 'liquidation', action: 'price-drop' }));
router.post('/liquidation/bundle', (_req: Request, res: Response) => res.json({ section: 'liquidation', action: 'bundle' }));
router.post('/liquidation/clearance', (_req: Request, res: Response) => res.json({ section: 'liquidation', action: 'clearance' }));

// Campaigns (4)
router.get('/campaigns', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'list' }));
router.post('/campaigns', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'create' }));
router.get('/campaigns/:id', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'detail' }));
router.post('/campaigns/:id/activate', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'activate' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/sell-through', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sell-through' }));
router.get('/analytics/revenue-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

