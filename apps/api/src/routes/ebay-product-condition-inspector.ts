import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.put('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.delete('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'delete' }));
router.post('/products/:id/inspect', (_req: Request, res: Response) => res.json({ section: 'products', action: 'inspect' }));

// Inspections (4)
router.get('/inspections', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'list' }));
router.get('/inspections/:id', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'detail' }));
router.post('/inspections', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'create' }));
router.put('/inspections/:id', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'update' }));

// Grades (4)
router.get('/grades', (_req: Request, res: Response) => res.json({ section: 'grades', action: 'list' }));
router.get('/grades/:id', (_req: Request, res: Response) => res.json({ section: 'grades', action: 'detail' }));
router.post('/grades', (_req: Request, res: Response) => res.json({ section: 'grades', action: 'create' }));
router.put('/grades/:id', (_req: Request, res: Response) => res.json({ section: 'grades', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/condition-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'condition-distribution' }));
router.get('/analytics/grade-accuracy', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'grade-accuracy' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
