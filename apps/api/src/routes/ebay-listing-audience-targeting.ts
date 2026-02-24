import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/widgets', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'widgets' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));
router.get('/dashboard/insights', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'insights' }));

// Listings (6)
router.get('/listings/overview', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'overview' }));
router.get('/listings/list', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/detail', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/create', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/update', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.delete('/listings/delete', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'delete' }));

// Audiences (4)
router.get('/audiences/overview', (_req: Request, res: Response) => res.json({ section: 'audiences', action: 'overview' }));
router.get('/audiences/list', (_req: Request, res: Response) => res.json({ section: 'audiences', action: 'list' }));
router.get('/audiences/detail', (_req: Request, res: Response) => res.json({ section: 'audiences', action: 'detail' }));
router.post('/audiences/create', (_req: Request, res: Response) => res.json({ section: 'audiences', action: 'create' }));

// Segments (4)
router.get('/segments/overview', (_req: Request, res: Response) => res.json({ section: 'segments', action: 'overview' }));
router.get('/segments/list', (_req: Request, res: Response) => res.json({ section: 'segments', action: 'list' }));
router.get('/segments/detail', (_req: Request, res: Response) => res.json({ section: 'segments', action: 'detail' }));
router.put('/segments/update', (_req: Request, res: Response) => res.json({ section: 'segments', action: 'update' }));

// Analytics (3)
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
router.get('/analytics/summary', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'summary' }));

// Settings (2)
router.get('/settings/get', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings/put', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

