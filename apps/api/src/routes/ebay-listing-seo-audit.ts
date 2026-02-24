import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/score, /dashboard/issues, /dashboard/improvements
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'score' }));
router.get('/dashboard/issues', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'issues' }));
router.get('/dashboard/improvements', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'improvements' }));

// Audits (6): list, detail, run, bulk-run, schedule, history
router.get('/audits', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'list' }));
router.get('/audits/:id', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'detail' }));
router.post('/audits/run', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'run' }));
router.post('/audits/bulk-run', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'bulk-run' }));
router.post('/audits/schedule', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'schedule' }));
router.get('/audits/:id/history', (_req: Request, res: Response) => res.json({ section: 'audits', action: 'history' }));

// Issues (4): list, detail, fix, ignore
router.get('/issues', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'list' }));
router.get('/issues/:id', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'detail' }));
router.post('/issues/:id/fix', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'fix' }));
router.post('/issues/:id/ignore', (_req: Request, res: Response) => res.json({ section: 'issues', action: 'ignore' }));

// Recommendations (4): list, detail, apply, bulk-apply
router.get('/recommendations', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'list' }));
router.get('/recommendations/:id', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'detail' }));
router.post('/recommendations/:id/apply', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'apply' }));
router.post('/recommendations/bulk-apply', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'bulk-apply' }));

// Analytics (3): analytics, analytics/seo-score-trend, analytics/visibility-impact
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/seo-score-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'seo-score-trend' }));
router.get('/analytics/visibility-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'visibility-impact' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, refresh
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

