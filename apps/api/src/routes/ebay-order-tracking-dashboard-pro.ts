import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/in-transit', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'in-transit' }));
router.get('/dashboard/delivered', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'delivered' }));
router.get('/dashboard/exceptions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'exceptions' }));

// Tracking (6)
router.get('/tracking', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'list' }));
router.get('/tracking/detail', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'detail' }));
router.get('/tracking/update', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'update' }));
router.get('/tracking/bulk-update', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'bulk-update' }));
router.get('/tracking/refresh', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'refresh' }));
router.get('/tracking/history', (_req: Request, res: Response) => res.json({ section: 'tracking', action: 'history' }));

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'list' }));
router.get('/carriers/detail', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'detail' }));
router.get('/carriers/performance', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'performance' }));
router.get('/carriers/issues', (_req: Request, res: Response) => res.json({ section: 'carriers', action: 'issues' }));

// Notifications (4)
router.get('/notifications', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'list' }));
router.get('/notifications/detail', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'detail' }));
router.get('/notifications/configure', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'configure' }));
router.get('/notifications/send', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'send' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/delivery-performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'delivery-performance' }));
router.get('/analytics/carrier-comparison', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'carrier-comparison' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.get('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

