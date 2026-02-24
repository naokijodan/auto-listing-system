import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/rates', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'rates' }));
router.get('/dashboard/conversions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'conversions' }));
router.get('/dashboard/impact', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'impact' }));

// Currencies (6)
router.get('/currencies', (_req: Request, res: Response) => res.json({ section: 'currencies', action: 'list' }));
router.get('/currencies/:code', (_req: Request, res: Response) => res.json({ section: 'currencies', action: 'detail' }));
router.post('/currencies', (_req: Request, res: Response) => res.json({ section: 'currencies', action: 'add' }));
router.delete('/currencies/:code', (_req: Request, res: Response) => res.json({ section: 'currencies', action: 'remove' }));
router.post('/currencies/:code/set-default', (_req: Request, res: Response) => res.json({ section: 'currencies', action: 'set-default' }));
router.post('/currencies/refresh-rates', (_req: Request, res: Response) => res.json({ section: 'currencies', action: 'refresh-rates' }));

// Conversions (4)
router.get('/conversions', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'list' }));
router.get('/conversions/:id', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'detail' }));
router.post('/conversions/convert', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'convert' }));
router.post('/conversions/bulk-convert', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'bulk-convert' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/exchange-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'exchange-impact' }));
router.get('/analytics/profit-by-currency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'profit-by-currency' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

