import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/unread', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'unread' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// Orders (6)
router.get('/orders/list', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/detail', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders/mark-read', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'mark-read' }));
router.post('/orders/bulk-read', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'bulk-read' }));
router.post('/orders/alerts', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'alerts' }));
router.post('/orders/snooze', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'snooze' }));

// Notifications (4)
router.get('/notifications/list', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'list' }));
router.get('/notifications/detail', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'detail' }));
router.post('/notifications/rules', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'rules' }));
router.post('/notifications/test', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'test' }));

// Channels (4)
router.get('/channels/list', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'list' }));
router.post('/channels/setup', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'setup' }));
router.post('/channels/test', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'test' }));
router.get('/channels/status', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'status' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/volume', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'volume' }));
router.get('/analytics/delivery-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'delivery-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

