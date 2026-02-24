import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/open', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'open' }));
router.get('/dashboard/resolved', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'resolved' }));
router.get('/dashboard/escalated', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'escalated' }));

// Exceptions (6): list, detail, create, resolve, escalate, history
router.get('/exceptions', (_req: Request, res: Response) => res.json({ section: 'exceptions', action: 'list' }));
router.get('/exceptions/list', (_req: Request, res: Response) => res.json({ section: 'exceptions', action: 'list' }));
router.get('/exceptions/detail', (_req: Request, res: Response) => res.json({ section: 'exceptions', action: 'detail' }));
router.post('/exceptions/create', (_req: Request, res: Response) => res.json({ section: 'exceptions', action: 'create' }));
router.post('/exceptions/resolve', (_req: Request, res: Response) => res.json({ section: 'exceptions', action: 'resolve' }));
router.post('/exceptions/escalate', (_req: Request, res: Response) => res.json({ section: 'exceptions', action: 'escalate' }));
router.get('/exceptions/history', (_req: Request, res: Response) => res.json({ section: 'exceptions', action: 'history' }));

// Rules (4): list, detail, create, update
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/list', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/detail', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/update', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Workflows (4): list, detail, create, trigger
router.get('/workflows', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'list' }));
router.get('/workflows/list', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'list' }));
router.get('/workflows/detail', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'detail' }));
router.post('/workflows/create', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'create' }));
router.post('/workflows/trigger', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'trigger' }));

// Analytics (3): analytics, analytics/exception-rate, analytics/resolution-time
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/exception-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'exception-rate' }));
router.get('/analytics/resolution-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'resolution-time' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
