import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Specs (6)
router.get('/specs', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'list' }));
router.get('/specs/:id', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'detail' }));
router.post('/specs', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'create' }));
router.put('/specs/:id', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'update' }));
router.delete('/specs/:id', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'delete' }));
router.post('/specs/:id/process', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'process' }));

// Sheets (4)
router.get('/sheets', (_req: Request, res: Response) => res.json({ section: 'sheets', action: 'list' }));
router.get('/sheets/:id', (_req: Request, res: Response) => res.json({ section: 'sheets', action: 'detail' }));
router.post('/sheets', (_req: Request, res: Response) => res.json({ section: 'sheets', action: 'create' }));
router.put('/sheets/:id', (_req: Request, res: Response) => res.json({ section: 'sheets', action: 'update' }));

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
