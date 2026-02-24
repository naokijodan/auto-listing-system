import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/trending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trending' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.post('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'create' }));
router.put('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'update' }));
router.post('/sellers/:id/assign', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'assign' }));
router.post('/sellers/:id/deactivate', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'deactivate' }));

// Articles (4)
router.get('/articles', (_req: Request, res: Response) => res.json({ section: 'articles', action: 'list' }));
router.get('/articles/:id', (_req: Request, res: Response) => res.json({ section: 'articles', action: 'detail' }));
router.post('/articles', (_req: Request, res: Response) => res.json({ section: 'articles', action: 'create' }));
router.put('/articles/:id', (_req: Request, res: Response) => res.json({ section: 'articles', action: 'update' }));

// Categories (4)
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'detail' }));
router.post('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'create' }));
router.put('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/popularity', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'popularity' }));
router.get('/analytics/search-terms', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'search-terms' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/cleanup', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'cleanup' }));

export default router;

