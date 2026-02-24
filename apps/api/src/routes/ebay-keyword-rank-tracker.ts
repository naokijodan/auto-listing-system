import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/top-keywords, /dashboard/rank-changes, /dashboard/opportunities
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-keywords', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-keywords' }));
router.get('/dashboard/rank-changes', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'rank-changes' }));
router.get('/dashboard/opportunities', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'opportunities' }));

// Keywords (6): list, detail, add, remove, track, bulk-track
router.get('/keywords', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'list' }));
router.get('/keywords/:id', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'detail' }));
router.post('/keywords', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'add' }));
router.post('/keywords/:id/remove', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'remove' }));
router.post('/keywords/:id/track', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'track' }));
router.post('/keywords/bulk-track', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'bulk-track' }));

// Rankings (4): list, detail, history, compare
router.get('/rankings', (_req: Request, res: Response) => res.json({ section: 'rankings', action: 'list' }));
router.get('/rankings/:id', (_req: Request, res: Response) => res.json({ section: 'rankings', action: 'detail' }));
router.get('/rankings/:id/history', (_req: Request, res: Response) => res.json({ section: 'rankings', action: 'history' }));
router.post('/rankings/compare', (_req: Request, res: Response) => res.json({ section: 'rankings', action: 'compare' }));

// Competitors (4): list, detail, add, remove
router.get('/competitors', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'list' }));
router.get('/competitors/:id', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'detail' }));
router.post('/competitors', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'add' }));
router.post('/competitors/:id/remove', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'remove' }));

// Analytics (3): analytics, analytics/rank-trend, analytics/visibility-score
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/rank-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'rank-trend' }));
router.get('/analytics/visibility-score', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'visibility-score' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, refresh
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

