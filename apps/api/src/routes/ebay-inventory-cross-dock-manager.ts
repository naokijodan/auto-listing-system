import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/capacity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'capacity' }));
router.get('/dashboard/inbound', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'inbound' }));
router.get('/dashboard/outbound', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'outbound' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:sku', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'create' }));
router.put('/inventory/:sku', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'update' }));
router.post('/inventory/rebalance', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'rebalance' }));
router.get('/inventory/history', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'history' }));

// Docks (4)
router.get('/docks', (_req: Request, res: Response) => res.json({ section: 'docks', action: 'list' }));
router.get('/docks/:id', (_req: Request, res: Response) => res.json({ section: 'docks', action: 'detail' }));
router.post('/docks', (_req: Request, res: Response) => res.json({ section: 'docks', action: 'create' }));
router.put('/docks/:id', (_req: Request, res: Response) => res.json({ section: 'docks', action: 'update' }));

// Transfers (4)
router.get('/transfers', (_req: Request, res: Response) => res.json({ section: 'transfers', action: 'list' }));
router.get('/transfers/:id', (_req: Request, res: Response) => res.json({ section: 'transfers', action: 'detail' }));
router.post('/transfers', (_req: Request, res: Response) => res.json({ section: 'transfers', action: 'create' }));
router.put('/transfers/:id', (_req: Request, res: Response) => res.json({ section: 'transfers', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/flow', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'flow' }));
router.get('/analytics/bottlenecks', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'bottlenecks' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

