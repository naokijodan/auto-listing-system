import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'index' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/open-tickets', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'open-tickets' }));
router.get('/dashboard/resolved', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'resolved' }));
router.get('/dashboard/satisfaction', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'satisfaction' }));

// Tickets (6)
router.get('/tickets/list', (_req: Request, res: Response) => res.json({ section: 'tickets', action: 'list' }));
router.get('/tickets/detail', (_req: Request, res: Response) => res.json({ section: 'tickets', action: 'detail' }));
router.get('/tickets/create', (_req: Request, res: Response) => res.json({ section: 'tickets', action: 'create' }));
router.get('/tickets/assign', (_req: Request, res: Response) => res.json({ section: 'tickets', action: 'assign' }));
router.get('/tickets/resolve', (_req: Request, res: Response) => res.json({ section: 'tickets', action: 'resolve' }));
router.get('/tickets/history', (_req: Request, res: Response) => res.json({ section: 'tickets', action: 'history' }));

// Templates (4)
router.get('/templates/list', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/detail', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.get('/templates/create', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.get('/templates/update', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Automation (4)
router.get('/automation/list', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'list' }));
router.get('/automation/detail', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'detail' }));
router.get('/automation/create', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'create' }));
router.get('/automation/configure', (_req: Request, res: Response) => res.json({ section: 'automation', action: 'configure' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'index' }));
router.get('/analytics/response-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'response-time' }));
router.get('/analytics/satisfaction-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'satisfaction-trend' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.get('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

