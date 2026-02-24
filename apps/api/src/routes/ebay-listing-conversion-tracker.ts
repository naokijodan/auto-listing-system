import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'index' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-converters', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-converters' }));
router.get('/dashboard/low-converters', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'low-converters' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));

// Listings (6)
router.get('/listings/list', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/detail', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.get('/listings/analyze', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'analyze' }));
router.get('/listings/optimize', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'optimize' }));
router.get('/listings/compare', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'compare' }));
router.get('/listings/history', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'history' }));

// Funnels (4)
router.get('/funnels/list', (_req: Request, res: Response) => res.json({ section: 'funnels', action: 'list' }));
router.get('/funnels/detail', (_req: Request, res: Response) => res.json({ section: 'funnels', action: 'detail' }));
router.get('/funnels/create', (_req: Request, res: Response) => res.json({ section: 'funnels', action: 'create' }));
router.get('/funnels/analyze', (_req: Request, res: Response) => res.json({ section: 'funnels', action: 'analyze' }));

// Tests (4)
router.get('/tests/list', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'list' }));
router.get('/tests/detail', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'detail' }));
router.get('/tests/create', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'create' }));
router.get('/tests/evaluate', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'evaluate' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'index' }));
router.get('/analytics/conversion-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion-trend' }));
router.get('/analytics/funnel-performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'funnel-performance' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.get('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

