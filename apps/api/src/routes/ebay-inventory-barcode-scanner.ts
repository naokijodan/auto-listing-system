import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'main' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));
router.get('/dashboard/queue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'queue' }));
router.get('/dashboard/errors', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'errors' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory/assign-barcode', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'assign-barcode' }));
router.post('/inventory/unassign-barcode', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'unassign-barcode' }));
router.get('/inventory/history', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'history' }));
router.post('/inventory/search', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'search' }));

// Barcodes (4)
router.get('/barcodes', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'list' }));
router.post('/barcodes/generate', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'generate' }));
router.post('/barcodes/print', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'print' }));
router.get('/barcodes/lookup', (_req: Request, res: Response) => res.json({ section: 'barcodes', action: 'lookup' }));

// Scanning (4)
router.get('/scanning', (_req: Request, res: Response) => res.json({ section: 'scanning', action: 'status' }));
router.post('/scanning/start', (_req: Request, res: Response) => res.json({ section: 'scanning', action: 'start' }));
router.post('/scanning/verify', (_req: Request, res: Response) => res.json({ section: 'scanning', action: 'verify' }));
router.get('/scanning/history', (_req: Request, res: Response) => res.json({ section: 'scanning', action: 'history' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'main' }));
router.get('/analytics/scan-accuracy', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'scan-accuracy' }));
router.get('/analytics/throughput', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'throughput' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
