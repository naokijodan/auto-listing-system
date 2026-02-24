import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-theme', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-theme' }));
router.get('/dashboard/drafts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'drafts' }));
router.get('/dashboard/previews', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'previews' }));

// Themes (6)
router.get('/themes/list', (_req: Request, res: Response) => res.json({ section: 'themes', action: 'list' }));
router.get('/themes/detail', (_req: Request, res: Response) => res.json({ section: 'themes', action: 'detail' }));
router.post('/themes/create', (_req: Request, res: Response) => res.json({ section: 'themes', action: 'create' }));
router.put('/themes/update', (_req: Request, res: Response) => res.json({ section: 'themes', action: 'update' }));
router.post('/themes/activate', (_req: Request, res: Response) => res.json({ section: 'themes', action: 'activate' }));
router.post('/themes/duplicate', (_req: Request, res: Response) => res.json({ section: 'themes', action: 'duplicate' }));

// Components (4)
router.get('/components/list', (_req: Request, res: Response) => res.json({ section: 'components', action: 'list' }));
router.get('/components/detail', (_req: Request, res: Response) => res.json({ section: 'components', action: 'detail' }));
router.post('/components/create', (_req: Request, res: Response) => res.json({ section: 'components', action: 'create' }));
router.put('/components/update', (_req: Request, res: Response) => res.json({ section: 'components', action: 'update' }));

// Colors (4)
router.get('/colors/list', (_req: Request, res: Response) => res.json({ section: 'colors', action: 'list' }));
router.get('/colors/detail', (_req: Request, res: Response) => res.json({ section: 'colors', action: 'detail' }));
router.post('/colors/create', (_req: Request, res: Response) => res.json({ section: 'colors', action: 'create' }));
router.post('/colors/apply', (_req: Request, res: Response) => res.json({ section: 'colors', action: 'apply' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/engagement', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'engagement' }));
router.get('/analytics/conversion-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/preview', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'preview' }));

export default router;

