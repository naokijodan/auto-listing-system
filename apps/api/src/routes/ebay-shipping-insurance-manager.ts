import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-policies', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-policies' }));
router.get('/dashboard/claims', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'claims' }));
router.get('/dashboard/savings', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'savings' }));

// Policies (6)
router.get('/policies', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'list' }));
router.get('/policies/:id', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'detail' }));
router.post('/policies', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'create' }));
router.put('/policies/:id', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'update' }));
router.post('/policies/:id/activate', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'activate' }));
router.post('/policies/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'policies', action: 'cancel' }));

// Claims (4)
router.get('/claims', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'list' }));
router.get('/claims/:id', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'detail' }));
router.post('/claims', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'file' }));
router.post('/claims/:id/resolve', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'resolve' }));

// Providers (4)
router.get('/providers', (_req: Request, res: Response) => res.json({ section: 'providers', action: 'list' }));
router.get('/providers/:id', (_req: Request, res: Response) => res.json({ section: 'providers', action: 'detail' }));
router.post('/providers', (_req: Request, res: Response) => res.json({ section: 'providers', action: 'add' }));
router.post('/providers/compare', (_req: Request, res: Response) => res.json({ section: 'providers', action: 'compare' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/claim-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'claim-rate' }));
router.get('/analytics/cost-benefit', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'cost-benefit' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

