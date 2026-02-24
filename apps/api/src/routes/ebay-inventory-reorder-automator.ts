import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/reorders', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'reorders' }));
router.get('/dashboard/low-stock', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'low-stock' }));
router.get('/dashboard/pending-orders', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending-orders' }));

// Reorders (6)
router.get('/reorders', (_req: Request, res: Response) => res.json({ section: 'reorders', action: 'list' }));
router.get('/reorders/:id', (_req: Request, res: Response) => res.json({ section: 'reorders', action: 'detail' }));
router.post('/reorders', (_req: Request, res: Response) => res.json({ section: 'reorders', action: 'create' }));
router.post('/reorders/:id/approve', (_req: Request, res: Response) => res.json({ section: 'reorders', action: 'approve' }));
router.post('/reorders/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'reorders', action: 'cancel' }));
router.get('/reorders/:id/history', (_req: Request, res: Response) => res.json({ section: 'reorders', action: 'history' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Suppliers (4)
router.get('/suppliers', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'list' }));
router.get('/suppliers/:id', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'detail' }));
router.post('/suppliers/:id/assign', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'assign' }));
router.post('/suppliers/compare', (_req: Request, res: Response) => res.json({ section: 'suppliers', action: 'compare' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/reorder-frequency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'reorder-frequency' }));
router.get('/analytics/stock-out-prevention', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'stock-out-prevention' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

