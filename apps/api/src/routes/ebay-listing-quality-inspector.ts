import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/issues', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'issues' }));
router.get('/dashboard/passed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'passed' }));
router.get('/dashboard/score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'score' }));

// Inspections (6)
router.get('/inspections', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'list' }));
router.get('/inspections/:id', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'detail' }));
router.post('/inspections/:id/run', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'run' }));
router.post('/inspections/schedule', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'schedule' }));
router.post('/inspections/bulk-run', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'bulk-run' }));
router.get('/inspections/history', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'history' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Issues (4)
router.get('/issues', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'list' }));
router.get('/issues/:id', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'detail' }));
router.post('/issues/:id/resolve', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'resolve' }));
router.post('/issues/:id/ignore', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'ignore' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/quality-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'quality-trend' }));
router.get('/analytics/issue-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'issue-distribution' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

