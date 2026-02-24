import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.put('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.delete('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'delete' }));
router.post('/orders/:id/process', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'process' }));

// Claims (4)
router.get('/claims', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'list' }));
router.get('/claims/:id', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'detail' }));
router.post('/claims', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'create' }));
router.put('/claims/:id', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'update' }));

// Resolutions (4)
router.get('/resolutions', (_req: Request, res: Response) => res.json({ section: 'resolutions', action: 'list' }));
router.get('/resolutions/:id', (_req: Request, res: Response) => res.json({ section: 'resolutions', action: 'detail' }));
router.post('/resolutions', (_req: Request, res: Response) => res.json({ section: 'resolutions', action: 'create' }));
router.put('/resolutions/:id', (_req: Request, res: Response) => res.json({ section: 'resolutions', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/claim-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'claim-rate' }));
router.get('/analytics/resolution-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'resolution-time' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
