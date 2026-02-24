import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'score' }));
router.get('/dashboard/issues', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'issues' }));
router.get('/dashboard/deadlines', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'deadlines' }));

// Policies (6): list, detail, check, bulk-check, acknowledge, history
router.get('/policies', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'list' }));
router.get('/policies/:id', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'detail' }));
router.post('/policies/:id/check', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'check' }));
router.post('/policies/bulk-check', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'bulk-check' }));
router.post('/policies/:id/acknowledge', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'acknowledge' }));
router.get('/policies/:id/history', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'history' }));

// Issues (4): list, detail, resolve, appeal
router.get('/issues', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'list' }));
router.get('/issues/:id', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'detail' }));
router.post('/issues/:id/resolve', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'resolve' }));
router.post('/issues/:id/appeal', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'appeal' }));

// Audits (4): list, detail, run, schedule
router.get('/audits', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'list' }));
router.get('/audits/:id', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'detail' }));
router.post('/audits/:id/run', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'run' }));
router.post('/audits/schedule', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'schedule' }));

// Analytics (3): analytics, analytics/compliance-score, analytics/issue-trends
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/compliance-score', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'compliance-score' }));
router.get('/analytics/issue-trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'issue-trends' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

