import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/processing', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'processing' }));
router.get('/dashboard/completed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'completed' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.put('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.delete('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'delete' }));
router.post('/orders/:id/assign', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'assign' }));

// Workflows (4)
router.get('/workflows', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'list' }));
router.get('/workflows/:id', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'detail' }));
router.post('/workflows', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'create' }));
router.put('/workflows/:id', (_req: Request, res: Response) => res.json({ section: 'workflows', action: 'update' }));

// Triggers (4)
router.get('/triggers', (_req: Request, res: Response) => res.json({ section: 'triggers', action: 'list' }));
router.get('/triggers/:id', (_req: Request, res: Response) => res.json({ section: 'triggers', action: 'detail' }));
router.post('/triggers', (_req: Request, res: Response) => res.json({ section: 'triggers', action: 'create' }));
router.put('/triggers/:id', (_req: Request, res: Response) => res.json({ section: 'triggers', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/conversion', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion' }));
router.get('/analytics/throughput', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'throughput' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

