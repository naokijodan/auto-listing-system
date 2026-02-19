import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Theme: red-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/summary' }));
router.get('/dashboard/violations', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/violations' }));
router.get('/dashboard/risk-score', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/risk-score' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/trends' }));

// Checks (6): CRUD + run + batch
router.get('/checks', (_req: Request, res: Response) => res.json({ section: 'checks', action: 'list' }));
router.get('/checks/:id', (req: Request, res: Response) => res.json({ section: 'checks', action: 'detail', id: req.params.id }));
router.post('/checks/create', (_req: Request, res: Response) => res.json({ section: 'checks', action: 'create' }));
router.put('/checks/:id', (req: Request, res: Response) => res.json({ section: 'checks', action: 'update', id: req.params.id }));
router.post('/checks/run', (_req: Request, res: Response) => res.json({ section: 'checks', action: 'run' }));
router.post('/checks/batch', (_req: Request, res: Response) => res.json({ section: 'checks', action: 'batch' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (req: Request, res: Response) => res.json({ section: 'rules', action: 'detail', id: req.params.id }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/priority', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'priority' }));

// Violations (4)
router.get('/violations', (_req: Request, res: Response) => res.json({ section: 'violations', action: 'list' }));
router.get('/violations/:id', (req: Request, res: Response) => res.json({ section: 'violations', action: 'detail', id: req.params.id }));
router.post('/violations/resolve', (_req: Request, res: Response) => res.json({ section: 'violations', action: 'resolve' }));
router.post('/violations/export', (_req: Request, res: Response) => res.json({ section: 'violations', action: 'export' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics' }));
router.get('/analytics/categories', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/categories' }));
router.get('/analytics/risk-trends', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/risk-trends' }));

// Settings (2) GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ util: 'health', status: 'ok' }));
router.post('/export', (_req: Request, res: Response) => res.json({ util: 'export', status: 'queued' }));
router.post('/import', (_req: Request, res: Response) => res.json({ util: 'import', status: 'queued' }));
router.post('/scan-all', (_req: Request, res: Response) => res.json({ util: 'scan-all', status: 'started' }));

export default router;
