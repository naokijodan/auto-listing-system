import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/in-transit', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'in-transit' }));
router.get('/dashboard/delivered', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'delivered' }));
router.get('/dashboard/exceptions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'exceptions' }));

// Shipments (6)
router.get('/shipments/list', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'list' }));
router.get('/shipments/detail/:id', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'detail' }));
router.get('/shipments/track/:id', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'track' }));
router.post('/shipments/update-status/:id', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'update-status' }));
router.post('/shipments/flag/:id', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'flag' }));
router.post('/shipments/bulk-update', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'bulk-update' }));

// Carriers (4)
router.get('/carriers/list', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'list' }));
router.get('/carriers/detail/:id', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'detail' }));
router.get('/carriers/performance/:id', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'performance' }));
router.get('/carriers/rates/:id', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'rates' }));

// Notifications (4)
router.get('/notifications/list', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'list' }));
router.get('/notifications/detail/:id', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'detail' }));
router.post('/notifications/create', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'create' }));
router.get('/notifications/preferences', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'preferences' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/delivery-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'delivery-time' }));
router.get('/analytics/carrier-comparison', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'carrier-comparison' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

