import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// セラー通知センターPro
// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/stats', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'stats' }));
router.get('/dashboard/tasks', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'tasks' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// Notifications (6)
router.get('/notifications/list', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'list' }));
router.post('/notifications/send', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'send' }));
router.post('/notifications/schedule', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'schedule' }));
router.get('/notifications/templates', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'templates' }));
router.get('/notifications/history', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'history' }));
router.get('/notifications/unread', (_req: Request, res: Response) => res.json({ section: 'notifications', action: 'unread' }));

// Channels (4)
router.get('/channels/email', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'email' }));
router.get('/channels/sms', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'sms' }));
router.get('/channels/webhook', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'webhook' }));
router.get('/channels/push', (_req: Request, res: Response) => res.json({ section: 'channels', action: 'push' }));

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/update', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));
router.delete('/rules/delete', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'delete' }));

// Analytics (3)
router.get('/analytics/summary', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'summary' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));
router.get('/analytics/reports', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'reports' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

