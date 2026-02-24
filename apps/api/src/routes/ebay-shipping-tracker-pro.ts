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
router.get('/shipments', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'list' }));
router.get('/shipments/:id', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'detail' }));
router.post('/shipments', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'create' }));
router.put('/shipments/:id', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'update' }));
router.post('/shipments/:id/track', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'track' }));
router.post('/shipments/bulk-track', (_req: Request, res: Response) => res.json({ section: 'shipments', action: 'bulk-track' }));

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'list' }));
router.get('/carriers/:id', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'detail' }));
router.post('/carriers', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'add' }));
router.delete('/carriers/:id', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'remove' }));

// Alerts (4)
router.get('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'detail' }));
router.post('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'create' }));
router.post('/alerts/:id/resolve', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'resolve' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/delivery-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'delivery-time' }));
router.get('/analytics/carrier-performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'carrier-performance' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

