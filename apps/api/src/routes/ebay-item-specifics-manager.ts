import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/coverage', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'coverage' }));
router.get('/dashboard/missing', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'missing' }));
router.get('/dashboard/suggestions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'suggestions' }));

// Specifics (6)
router.get('/specifics', (_req: Request, res: Response) => res.json({ section: 'specifics', action: 'list' }));
router.get('/specifics/:id', (_req: Request, res: Response) => res.json({ section: 'specifics', action: 'detail' }));
router.post('/specifics', (_req: Request, res: Response) => res.json({ section: 'specifics', action: 'create' }));
router.put('/specifics/:id', (_req: Request, res: Response) => res.json({ section: 'specifics', action: 'update' }));
router.put('/specifics/bulk', (_req: Request, res: Response) => res.json({ section: 'specifics', action: 'bulk-update' }));
router.delete('/specifics/:id', (_req: Request, res: Response) => res.json({ section: 'specifics', action: 'delete' }));

// Categories (4)
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'detail' }));
router.get('/categories/mapping', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'mapping' }));
router.get('/categories/:id/required-specifics', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'required-specifics' }));

// Templates (4)
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/coverage-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'coverage-trend' }));
router.get('/analytics/impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

