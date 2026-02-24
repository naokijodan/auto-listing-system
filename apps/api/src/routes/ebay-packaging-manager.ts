import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/materials', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'materials' }));
router.get('/dashboard/costs', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'costs' }));
router.get('/dashboard/sustainability', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'sustainability' }));

// Packages (6): list, detail, create, update, recommend, bulk-assign
router.get('/packages', (_req: Request, res: Response) => res.json({ section: 'packages', action: 'list' }));
router.get('/packages/:id', (_req: Request, res: Response) => res.json({ section: 'packages', action: 'detail' }));
router.post('/packages', (_req: Request, res: Response) => res.json({ section: 'packages', action: 'create' }));
router.put('/packages/:id', (_req: Request, res: Response) => res.json({ section: 'packages', action: 'update' }));
router.post('/packages/:id/recommend', (_req: Request, res: Response) => res.json({ section: 'packages', action: 'recommend' }));
router.post('/packages/bulk-assign', (_req: Request, res: Response) => res.json({ section: 'packages', action: 'bulk-assign' }));

// Materials (4): list, detail, create, update
router.get('/materials', (_req: Request, res: Response) => res.json({ section: 'materials', action: 'list' }));
router.get('/materials/:id', (_req: Request, res: Response) => res.json({ section: 'materials', action: 'detail' }));
router.post('/materials', (_req: Request, res: Response) => res.json({ section: 'materials', action: 'create' }));
router.put('/materials/:id', (_req: Request, res: Response) => res.json({ section: 'materials', action: 'update' }));

// Templates (4): list, detail, create, update
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Analytics (3): analytics, analytics/cost-optimization, analytics/sustainability-score
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/cost-optimization', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'cost-optimization' }));
router.get('/analytics/sustainability-score', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sustainability-score' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

