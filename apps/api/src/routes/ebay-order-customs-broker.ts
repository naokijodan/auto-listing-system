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

// Customs (4)
router.get('/customs', (_req: Request, res: Response) => res.json({ section: 'customs', action: 'list' }));
router.get('/customs/:id', (_req: Request, res: Response) => res.json({ section: 'customs', action: 'detail' }));
router.post('/customs', (_req: Request, res: Response) => res.json({ section: 'customs', action: 'create' }));
router.put('/customs/:id', (_req: Request, res: Response) => res.json({ section: 'customs', action: 'update' }));

// Declarations (4)
router.get('/declarations', (_req: Request, res: Response) => res.json({ section: 'declarations', action: 'list' }));
router.get('/declarations/:id', (_req: Request, res: Response) => res.json({ section: 'declarations', action: 'detail' }));
router.post('/declarations', (_req: Request, res: Response) => res.json({ section: 'declarations', action: 'create' }));
router.put('/declarations/:id', (_req: Request, res: Response) => res.json({ section: 'declarations', action: 'update' }));

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
