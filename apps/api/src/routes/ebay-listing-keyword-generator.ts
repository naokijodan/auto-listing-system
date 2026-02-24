import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));
router.get('/dashboard/top-performing', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-performing' }));
router.get('/dashboard/recent-activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent-activity' }));

// Listings (6)
router.get('/listings/list', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/detail/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/generate/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'generate' }));
router.post('/listings/optimize/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'optimize' }));
router.post('/listings/bulk-generate', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-generate' }));
router.post('/listings/bulk-optimize', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-optimize' }));

// Keywords (4)
router.get('/keywords/list', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'list' }));
router.post('/keywords/generate', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'generate' }));
router.put('/keywords/update/:id', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'update' }));
router.delete('/keywords/delete/:id', (_req: Request, res: Response) => res.json({ section: 'keywords', action: 'delete' }));

// Suggestions (4)
router.get('/suggestions/list', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'list' }));
router.get('/suggestions/for-listing/:id', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'for-listing' }));
router.post('/suggestions/accept/:id', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'accept' }));
router.post('/suggestions/reject/:id', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'reject' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
router.get('/analytics/top-keywords', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'top-keywords' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

