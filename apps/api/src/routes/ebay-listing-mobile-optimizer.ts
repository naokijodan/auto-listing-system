import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/mobile-score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'mobile-score' }));
router.get('/dashboard/optimized', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'optimized' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/optimize', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'optimize' }));
router.post('/listings/bulk-optimize', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-optimize' }));
router.get('/listings/violations', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'violations' }));
router.get('/listings/history', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'history' }));

// Mobile (4)
router.get('/mobile', (_req: Request, res: Response) => res.json({ section: 'mobile', action: 'overview' }));
router.get('/mobile/guidelines', (_req: Request, res: Response) => res.json({ section: 'mobile', action: 'guidelines' }));
router.post('/mobile/check', (_req: Request, res: Response) => res.json({ section: 'mobile', action: 'check' }));
router.post('/mobile/fix', (_req: Request, res: Response) => res.json({ section: 'mobile', action: 'fix' }));

// Previews (4)
router.get('/previews', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'list' }));
router.get('/previews/:id', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'detail' }));
router.post('/previews/generate', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'generate' }));
router.get('/previews/compare', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'compare' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

