import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/processed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'processed' }));
router.get('/dashboard/disputed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'disputed' }));

// Refunds (6)
router.get('/refunds', (_req: Request, res: Response) => res.json({ section: 'refunds', action: 'list' }));
router.get('/refunds/:id', (_req: Request, res: Response) => res.json({ section: 'refunds', action: 'detail' }));
router.post('/refunds', (_req: Request, res: Response) => res.json({ section: 'refunds', action: 'create' }));
router.post('/refunds/:id/approve', (_req: Request, res: Response) => res.json({ section: 'refunds', action: 'approve' }));
router.post('/refunds/:id/reject', (_req: Request, res: Response) => res.json({ section: 'refunds', action: 'reject' }));
router.get('/refunds/:id/history', (_req: Request, res: Response) => res.json({ section: 'refunds', action: 'history' }));

// Policies (4)
router.get('/policies', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'list' }));
router.get('/policies/:id', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'detail' }));
router.post('/policies', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'create' }));
router.put('/policies/:id', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'update' }));

// Appeals (4)
router.get('/appeals', (_req: Request, res: Response) => res.json({ section: 'appeals', action: 'list' }));
router.get('/appeals/:id', (_req: Request, res: Response) => res.json({ section: 'appeals', action: 'detail' }));
router.post('/appeals', (_req: Request, res: Response) => res.json({ section: 'appeals', action: 'submit' }));
router.post('/appeals/:id/resolve', (_req: Request, res: Response) => res.json({ section: 'appeals', action: 'resolve' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/refund-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'refund-trend' }));
router.get('/analytics/reason-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'reason-distribution' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

