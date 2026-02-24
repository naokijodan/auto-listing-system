import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/pending, /dashboard/shipped, /dashboard/received
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/shipped', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'shipped' }));
router.get('/dashboard/received', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'received' }));

// Orders (6): list, detail, create, update, track, cancel
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.put('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.get('/orders/:id/track', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'track' }));
router.post('/orders/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'cancel' }));

// Suppliers (4): list, detail, performance, history
router.get('/suppliers', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'list' }));
router.get('/suppliers/:id', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'detail' }));
router.get('/suppliers/:id/performance', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'performance' }));
router.get('/suppliers/:id/history', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'history' }));

// Shipments (4): list, detail, track, confirm-receipt
router.get('/shipments', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'list' }));
router.get('/shipments/:id', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'detail' }));
router.get('/shipments/:id/track', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'track' }));
router.post('/shipments/:id/confirm-receipt', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'confirm-receipt' }));

// Analytics (3): analytics, analytics/lead-time, analytics/fulfillment-rate
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/lead-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'lead-time' }));
router.get('/analytics/fulfillment-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'fulfillment-rate' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

