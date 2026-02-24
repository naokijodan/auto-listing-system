import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.put('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.delete('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'delete' }));
router.post('/products/:id/process', (_req: Request, res: Response) => res.json({ section: 'products', action: 'process' }));

// Barcodes (4)
router.get('/barcodes', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'list' }));
router.get('/barcodes/:id', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'detail' }));
router.post('/barcodes', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'create' }));
router.put('/barcodes/:id', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'update' }));

// Formats (4)
router.get('/formats', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'list' }));
router.get('/formats/:id', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'detail' }));
router.post('/formats', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'create' }));
router.put('/formats/:id', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
