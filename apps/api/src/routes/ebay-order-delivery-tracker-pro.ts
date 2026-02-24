import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/in-transit', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'in-transit' }));
router.get('/dashboard/delivered', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'delivered' }));
router.get('/dashboard/exceptions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'exceptions' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.get('/orders/:id/track', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'track' }));
router.post('/orders/:id/flag', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'flag' }));
router.post('/orders/bulk-update', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'bulk-update' }));
router.post('/orders/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'cancel' }));

// Deliveries (4)
router.get('/deliveries', (_req: Request, res: Response) => res.json({ section: 'deliveries', action: 'list' }));
router.get('/deliveries/:id', (_req: Request, res: Response) => res.json({ section: 'deliveries', action: 'detail' }));
router.get('/deliveries/:id/estimate', (_req: Request, res: Response) => res.json({ section: 'deliveries', action: 'estimate' }));
router.post('/deliveries/schedule', (_req: Request, res: Response) => res.json({ section: 'deliveries', action: 'schedule' }));

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'list' }));
router.get('/carriers/:id', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'detail' }));
router.get('/carriers/:id/performance', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'performance' }));
router.get('/carriers/:id/rates', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'rates' }));

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

