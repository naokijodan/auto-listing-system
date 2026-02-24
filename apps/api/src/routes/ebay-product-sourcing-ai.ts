import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/saved', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'saved' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));

// Products (6)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/evaluate', (_req: Request, res: Response) => res.json({ section: 'products', action: 'evaluate' }));
router.get('/products/price-check', (_req: Request, res: Response) => res.json({ section: 'products', action: 'price-check' }));
router.get('/products/similar', (_req: Request, res: Response) => res.json({ section: 'products', action: 'similar' }));
router.get('/products/profitability', (_req: Request, res: Response) => res.json({ section: 'products', action: 'profitability' }));

// Sourcing (4)
router.get('/sourcing/search', (_req: Request, res: Response) => res.json({ section: 'sourcing', action: 'search' }));
router.get('/sourcing/suppliers', (_req: Request, res: Response) => res.json({ section: 'sourcing', action: 'suppliers' }));
router.get('/sourcing/monitor', (_req: Request, res: Response) => res.json({ section: 'sourcing', action: 'monitor' }));
router.get('/sourcing/alerts', (_req: Request, res: Response) => res.json({ section: 'sourcing', action: 'alerts' }));

// Recommendations (4)
router.get('/recommendations/list', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'list' }));
router.get('/recommendations/detail', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'detail' }));
router.post('/recommendations/save', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'save' }));
router.post('/recommendations/dismiss', (_req: Request, res: Response) => res.json({ section: 'recommendations', action: 'dismiss' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/opportunity', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'opportunity' }));
router.get('/analytics/success-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'success-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

