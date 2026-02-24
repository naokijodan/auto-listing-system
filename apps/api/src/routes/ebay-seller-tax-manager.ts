import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/pending-filings', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending-filings' }));
router.get('/dashboard/payments', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'payments' }));
router.get('/dashboard/deadlines', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'deadlines' }));

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.post('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'create' }));
router.put('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'update' }));
router.delete('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'delete' }));
router.post('/sellers/:id/assign-tax-profile', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'assign-tax-profile' }));

// Taxes (4)
router.get('/taxes', (_req: Request, res: Response) => res.json({ section: 'taxes', action: 'list' }));
router.get('/taxes/:id', (_req: Request, res: Response) => res.json({ section: 'taxes', action: 'detail' }));
router.post('/taxes', (_req: Request, res: Response) => res.json({ section: 'taxes', action: 'create' }));
router.put('/taxes/:id', (_req: Request, res: Response) => res.json({ section: 'taxes', action: 'update' }));

// Filings (4)
router.get('/filings', (_req: Request, res: Response) => res.json({ section: 'filings', action: 'list' }));
router.get('/filings/:id', (_req: Request, res: Response) => res.json({ section: 'filings', action: 'detail' }));
router.post('/filings', (_req: Request, res: Response) => res.json({ section: 'filings', action: 'create' }));
router.put('/filings/:id', (_req: Request, res: Response) => res.json({ section: 'filings', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/tax-liability', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'tax-liability' }));
router.get('/analytics/payment-history', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'payment-history' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

