import { Router, Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard' }));
router.get('/dashboard/summary', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/summary' }));
router.get('/dashboard/pending', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/pending' }));
router.get('/dashboard/sent', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/sent' }));
router.get('/dashboard/stats', (_: Request, res: Response) => res.json({ section: 'dashboard', path: '/dashboard/stats' }));

// Automations (6): CRUD + enable + test (6 total)
router.get('/automations', (_: Request, res: Response) => res.json({ section: 'automations', action: 'list' }));
router.post('/automations', (req: Request, res: Response) => res.json({ section: 'automations', action: 'create', body: req.body }));
router.put('/automations/:id', (req: Request, res: Response) => res.json({ section: 'automations', action: 'update', id: req.params.id, body: req.body }));
router.delete('/automations/:id', (req: Request, res: Response) => res.json({ section: 'automations', action: 'delete', id: req.params.id }));
router.post('/automations/:id/enable', (req: Request, res: Response) => res.json({ section: 'automations', action: 'enable', id: req.params.id }));
router.post('/automations/:id/test', (req: Request, res: Response) => res.json({ section: 'automations', action: 'test', id: req.params.id }));

// Templates (4)
router.get('/templates', (_: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/:id', (req: Request, res: Response) => res.json({ section: 'templates', action: 'detail', id: req.params.id }));
router.post('/templates/create', (req: Request, res: Response) => res.json({ section: 'templates', action: 'create', body: req.body }));
router.post('/templates/preview', (req: Request, res: Response) => res.json({ section: 'templates', action: 'preview', body: req.body }));

// Rules (4)
router.get('/rules', (_: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (req: Request, res: Response) => res.json({ section: 'rules', action: 'detail', id: req.params.id }));
router.post('/rules/create', (req: Request, res: Response) => res.json({ section: 'rules', action: 'create', body: req.body }));
router.put('/rules/priority', (req: Request, res: Response) => res.json({ section: 'rules', action: 'priority', body: req.body }));

// Analytics (3)
router.get('/analytics', (_: Request, res: Response) => res.json({ section: 'analytics', path: '/analytics' }));
router.get('/analytics/performance', (_: Request, res: Response) => res.json({ section: 'analytics', path: '/analytics/performance' }));
router.get('/analytics/response-rate', (_: Request, res: Response) => res.json({ section: 'analytics', path: '/analytics/response-rate' }));

// Settings (2)
router.get('/settings', (_: Request, res: Response) => res.json({ section: 'settings', method: 'GET' }));
router.put('/settings', (req: Request, res: Response) => res.json({ section: 'settings', method: 'PUT', body: req.body }));

// Utilities (4)
router.get('/health', (_: Request, res: Response) => res.json({ status: 'ok', service: 'ebay-feedback-automation' }));
router.post('/export', (_: Request, res: Response) => res.json({ action: 'export', status: 'queued' }));
router.post('/import', (req: Request, res: Response) => res.json({ action: 'import', received: !!req.body }));
router.post('/send-now', (_: Request, res: Response) => res.json({ action: 'send-now', status: 'triggered' }));

export default router;

