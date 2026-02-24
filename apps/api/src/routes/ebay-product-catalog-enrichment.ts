import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/enriched', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'enriched' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/quality-score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'quality-score' }));

// Products (6)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/enrich/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'enrich' }));
router.post('/products/bulk-enrich', (_req: Request, res: Response) => res.json({ section: 'products', action: 'bulk-enrich' }));
router.post('/products/validate/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'validate' }));
router.post('/products/revert/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'revert' }));

// Catalog (4)
router.get('/catalog/list', (_req: Request, res: Response) => res.json({ section: 'catalog', action: 'list' }));
router.get('/catalog/detail/:id', (_req: Request, res: Response) => res.json({ section: 'catalog', action: 'detail' }));
router.post('/catalog/create', (_req: Request, res: Response) => res.json({ section: 'catalog', action: 'create' }));
router.post('/catalog/apply/:id', (_req: Request, res: Response) => res.json({ section: 'catalog', action: 'apply' }));

// Enrichment (4)
router.get('/enrichment/list', (_req: Request, res: Response) => res.json({ section: 'enrichment', action: 'list' }));
router.get('/enrichment/detail/:id', (_req: Request, res: Response) => res.json({ section: 'enrichment', action: 'detail' }));
router.post('/enrichment/configure/:id', (_req: Request, res: Response) => res.json({ section: 'enrichment', action: 'configure' }));
router.post('/enrichment/test/:id', (_req: Request, res: Response) => res.json({ section: 'enrichment', action: 'test' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/enrichment-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'enrichment-rate' }));
router.get('/analytics/quality-improvement', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'quality-improvement' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
