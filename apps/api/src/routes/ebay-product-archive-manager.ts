import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Archives (6)
router.get('/archives', (_req: Request, res: Response) => res.json({ section: 'archives', action: 'list' }));
router.get('/archives/:id', (_req: Request, res: Response) => res.json({ section: 'archives', action: 'detail' }));
router.post('/archives', (_req: Request, res: Response) => res.json({ section: 'archives', action: 'create' }));
router.put('/archives/:id', (_req: Request, res: Response) => res.json({ section: 'archives', action: 'update' }));
router.delete('/archives/:id', (_req: Request, res: Response) => res.json({ section: 'archives', action: 'delete' }));
router.post('/archives/:id/process', (_req: Request, res: Response) => res.json({ section: 'archives', action: 'process' }));

// Categories (4)
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'detail' }));
router.post('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'create' }));
router.put('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'update' }));

// Products (4)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.put('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
