import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/inbox', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'inbox' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/satisfaction', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'satisfaction' }));

// Sellers (6)
router.get('/sellers/list', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/detail/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.get('/sellers/performance', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'performance' }));
router.get('/sellers/inquiries', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'inquiries' }));
router.post('/sellers/priorities', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'priorities' }));
router.post('/sellers/notify', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'notify' }));

// Support (4)
router.get('/support/tickets', (_req: Request, res: Response) => res.json({ section: 'support', action: 'tickets' }));
router.post('/support/reply/:id', (_req: Request, res: Response) => res.json({ section: 'support', action: 'reply' }));
router.post('/support/escalate/:id', (_req: Request, res: Response) => res.json({ section: 'support', action: 'escalate' }));
router.post('/support/close/:id', (_req: Request, res: Response) => res.json({ section: 'support', action: 'close' }));

// Automation (4)
router.get('/automation/rules', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'rules' }));
router.post('/automation/create', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'create' }));
router.put('/automation/update/:id', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'update' }));
router.delete('/automation/delete/:id', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'delete' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/response-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'response-time' }));
router.get('/analytics/csat', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'csat' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

