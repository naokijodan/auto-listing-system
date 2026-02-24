import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.delete('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'delete' }));
router.post('/listings/:id/publish', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'publish' }));

// Bundles (4)
router.get('/bundles', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'list' }));
router.get('/bundles/:id', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'detail' }));
router.post('/bundles', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'create' }));
router.put('/bundles/:id', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'update' }));

// Recommendations (4)
router.get('/recommendations', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'list' }));
router.get('/recommendations/:id', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'detail' }));
router.post('/recommendations', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'create' }));
router.put('/recommendations/:id', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/bundle-performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'bundle-performance' }));
router.get('/analytics/conversion-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
