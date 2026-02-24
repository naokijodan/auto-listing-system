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

// Labels (4)
router.get('/labels', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'list' }));
router.get('/labels/:id', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'detail' }));
router.post('/labels', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'create' }));
router.put('/labels/:id', (_req: Request, res: Response) => res.json({ section: 'labels', action: 'update' }));

// Batches (4)
router.get('/batches', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'list' }));
router.get('/batches/:id', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'detail' }));
router.post('/batches', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'create' }));
router.put('/batches/:id', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'update' }));

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
