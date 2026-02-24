import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/help', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'help' }));

// products (6)
router.get('/products/overview', (_req: Request, res: Response) => res.json({ section: 'products', action: 'overview' }));
router.get('/products/catalog', (_req: Request, res: Response) => res.json({ section: 'products', action: 'catalog' }));
router.get('/products/variations', (_req: Request, res: Response) => res.json({ section: 'products', action: 'variations' }));
router.get('/products/attributes', (_req: Request, res: Response) => res.json({ section: 'products', action: 'attributes' }));
router.get('/products/bulk', (_req: Request, res: Response) => res.json({ section: 'products', action: 'bulk' }));
router.get('/products/drafts', (_req: Request, res: Response) => res.json({ section: 'products', action: 'drafts' }));

// photos (4)
router.get('/photos/overview', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'overview' }));
router.get('/photos/upload', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'upload' }));
router.get('/photos/library', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'library' }));
router.get('/photos/issues', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'issues' }));

// enhancement (4)
router.get('/enhancement/overview', (_req: Request, res: Response) => res.json({ section: 'enhancement', action: 'overview' }));
router.get('/enhancement/ai-enhance', (_req: Request, res: Response) => res.json({ section: 'enhancement', action: 'ai-enhance' }));
router.get('/enhancement/presets', (_req: Request, res: Response) => res.json({ section: 'enhancement', action: 'presets' }));
router.get('/enhancement/history', (_req: Request, res: Response) => res.json({ section: 'enhancement', action: 'history' }));

// analytics (3)
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));
router.get('/analytics/reports', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'reports' }));

// settings (2)
router.get('/settings/general', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'general' }));
router.get('/settings/permissions', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'permissions' }));

// utilities (4)
router.get('/utilities/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/utilities/cache', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'cache' }));
router.get('/utilities/logs', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'logs' }));
router.get('/utilities/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));

export default router;

