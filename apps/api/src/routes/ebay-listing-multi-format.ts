import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// 出品マルチフォーマット - テーマカラー: lime-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activities', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activities' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.post('/listings/:id/activate', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'activate' }));
router.delete('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'delete' }));

// Formats (4)
router.get('/formats', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'list' }));
router.get('/formats/:id', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'detail' }));
router.post('/formats', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'create' }));
router.put('/formats/:id', (_req: Request, res: Response) => res.json({ section: 'formats', action: 'update' }));

// Conversions (4)
router.get('/conversions', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'list' }));
router.get('/conversions/:id', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'detail' }));
router.post('/conversions/:id/preview', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'preview' }));
router.post('/conversions/:id/apply', (_req: Request, res: Response) => res.json({ section: 'conversions', action: 'apply' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
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

