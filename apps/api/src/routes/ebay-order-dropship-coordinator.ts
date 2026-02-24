import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/fulfillment-rate', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'fulfillment-rate' }));
router.get('/dashboard/delayed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'delayed' }));
router.get('/dashboard/exceptions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'exceptions' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.put('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.post('/orders/:id/assign-supplier', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'assign-supplier' }));
router.get('/orders/:id/history', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'history' }));

// Suppliers (4)
router.get('/suppliers', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'list' }));
router.get('/suppliers/:id', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'detail' }));
router.post('/suppliers', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'create' }));
router.put('/suppliers/:id', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'update' }));

// Tracking (4)
router.get('/tracking', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'overview' }));
router.get('/tracking/:id', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'detail' }));
router.post('/tracking/update', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'update' }));
router.get('/tracking/exceptions', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'exceptions' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
router.get('/analytics/supplier-metrics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'supplier-metrics' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

