import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/recent-activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent-activity' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.get('/orders/unmatched', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'unmatched' }));
router.get('/orders/matched', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'matched' }));
router.post('/orders/:id/assign', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'assign' }));
router.post('/orders/:id/unassign', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'unassign' }));

// Suppliers (4)
router.get('/suppliers', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'list' }));
router.get('/suppliers/:id', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'detail' }));
router.post('/suppliers', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'create' }));
router.put('/suppliers/:id', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'update' }));

// Matching (4)
router.get('/matching/rules', (_req: Request, res: Response) => res.json({ section: 'matching', action: 'rules' }));
router.post('/matching/test', (_req: Request, res: Response) => res.json({ section: 'matching', action: 'test' }));
router.post('/matching/run', (_req: Request, res: Response) => res.json({ section: 'matching', action: 'run' }));
router.get('/matching/suggestions', (_req: Request, res: Response) => res.json({ section: 'matching', action: 'suggestions' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/match-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'match-rate' }));
router.get('/analytics/lead-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'lead-time' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

