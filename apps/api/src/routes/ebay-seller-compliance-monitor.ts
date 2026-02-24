import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/help', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'help' }));

// sellers (6)
router.get('/sellers/overview', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'overview' }));
router.get('/sellers/ratings', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'ratings' }));
router.get('/sellers/cases', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'cases' }));
router.get('/sellers/messages', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'messages' }));
router.get('/sellers/policies', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'policies' }));
router.get('/sellers/bulk', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'bulk' }));

// compliance (4)
router.get('/compliance/overview', (_req: Request, res: Response) => res.json({ section: 'compliance', action: 'overview' }));
router.get('/compliance/checks', (_req: Request, res: Response) => res.json({ section: 'compliance', action: 'checks' }));
router.get('/compliance/rules', (_req: Request, res: Response) => res.json({ section: 'compliance', action: 'rules' }));
router.get('/compliance/audits', (_req: Request, res: Response) => res.json({ section: 'compliance', action: 'audits' }));

// violations (4)
router.get('/violations/overview', (_req: Request, res: Response) => res.json({ section: 'violations', action: 'overview' }));
router.get('/violations/open', (_req: Request, res: Response) => res.json({ section: 'violations', action: 'open' }));
router.get('/violations/resolved', (_req: Request, res: Response) => res.json({ section: 'violations', action: 'resolved' }));
router.get('/violations/escalations', (_req: Request, res: Response) => res.json({ section: 'violations', action: 'escalations' }));

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

