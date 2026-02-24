import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/top-listings', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-listings' }));
router.get('/dashboard/proof-impact', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'proof-impact' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.post('/listings/:id/attach-proof', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'attach-proof' }));
router.post('/listings/:id/remove-proof', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'remove-proof' }));

// Proofs (4)
router.get('/proofs', (_req: Request, res: Response) => res.json({ section: 'proofs', action: 'list' }));
router.get('/proofs/:id', (_req: Request, res: Response) => res.json({ section: 'proofs', action: 'detail' }));
router.post('/proofs', (_req: Request, res: Response) => res.json({ section: 'proofs', action: 'create' }));
router.put('/proofs/:id', (_req: Request, res: Response) => res.json({ section: 'proofs', action: 'update' }));

// Badges (4)
router.get('/badges', (_req: Request, res: Response) => res.json({ section: 'badges', action: 'list' }));
router.get('/badges/:id', (_req: Request, res: Response) => res.json({ section: 'badges', action: 'detail' }));
router.post('/badges', (_req: Request, res: Response) => res.json({ section: 'badges', action: 'create' }));
router.put('/badges/:id', (_req: Request, res: Response) => res.json({ section: 'badges', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/engagement', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'engagement' }));
router.get('/analytics/conversion', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

