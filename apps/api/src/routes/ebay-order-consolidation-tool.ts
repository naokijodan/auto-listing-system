import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/consolidatable', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'consolidatable' }));
router.get('/dashboard/consolidated', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'consolidated' }));
router.get('/dashboard/savings', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'savings' }));

// Consolidations (6)
router.get('/consolidations', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'list' }));
router.get('/consolidations/:id', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'detail' }));
router.post('/consolidations', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'create' }));
router.post('/consolidations/:id/merge', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'merge' }));
router.post('/consolidations/:id/split', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'split' }));
router.post('/consolidations/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'cancel' }));

// Orders (4)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders/:id/group', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'group' }));
router.post('/orders/:id/ungroup', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'ungroup' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/shipping-savings', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'shipping-savings' }));
router.get('/analytics/efficiency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'efficiency' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

