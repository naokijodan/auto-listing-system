import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/top-impressions, /dashboard/low-impressions, /dashboard/trends
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-impressions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-impressions' }));
router.get('/dashboard/low-impressions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'low-impressions' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));

// Impressions (6): list, detail, history, compare, by-keyword, by-category
router.get('/impressions', (_req: Request, res: Response) => res.json({ section: 'impressions', action: 'list' }));
router.get('/impressions/:id', (_req: Request, res: Response) => res.json({ section: 'impressions', action: 'detail' }));
router.get('/impressions/:id/history', (_req: Request, res: Response) => res.json({ section: 'impressions', action: 'history' }));
router.post('/impressions/compare', (_req: Request, res: Response) => res.json({ section: 'impressions', action: 'compare' }));
router.get('/impressions/by-keyword', (_req: Request, res: Response) => res.json({ section: 'impressions', action: 'by-keyword' }));
router.get('/impressions/by-category', (_req: Request, res: Response) => res.json({ section: 'impressions', action: 'by-category' }));

// Listings (4): list, detail, optimize, bulk-optimize
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/:id/optimize', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'optimize' }));
router.post('/listings/bulk-optimize', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-optimize' }));

// Keywords (4): list, detail, track, remove
router.get('/keywords', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'list' }));
router.get('/keywords/:id', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'detail' }));
router.post('/keywords/:id/track', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'track' }));
router.post('/keywords/:id/remove', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'remove' }));

// Analytics (3): analytics, analytics/impression-to-click, analytics/visibility-score
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/impression-to-click', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'impression-to-click' }));
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

