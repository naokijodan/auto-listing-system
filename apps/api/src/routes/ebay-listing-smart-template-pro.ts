import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/help', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'help' }));

// listings (6)
router.get('/listings/overview', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'overview' }));
router.get('/listings/new', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'new' }));
router.get('/listings/bulk', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk' }));
router.get('/listings/schedules', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'schedules' }));
router.get('/listings/drafts', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'drafts' }));
router.get('/listings/quality', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'quality' }));

// templates (4)
router.get('/templates/overview', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'overview' }));
router.get('/templates/create', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.get('/templates/manage', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'manage' }));
router.get('/templates/import', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'import' }));

// customization (4)
router.get('/customization/overview', (_req: Request, res: Response) => res.json({ section: 'customization', action: 'overview' }));
router.get('/customization/themes', (_req: Request, res: Response) => res.json({ section: 'customization', action: 'themes' }));
router.get('/customization/components', (_req: Request, res: Response) => res.json({ section: 'customization', action: 'components' }));
router.get('/customization/rules', (_req: Request, res: Response) => res.json({ section: 'customization', action: 'rules' }));

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

