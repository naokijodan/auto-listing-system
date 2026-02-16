import { Router, Request, Response } from 'express';

const router = Router();
const THEME = 'blue-600';

router.use((_, res, next) => {
  res.setHeader('X-Theme-Color', THEME);
  next();
});

const ok = (res: Response, path: string, extra: Record<string, unknown> = {}) =>
  res.json({ ok: true, theme: THEME, path, ...extra });

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => ok(res, '/dashboard'));
router.get('/dashboard/summary', (req: Request, res: Response) => ok(res, '/dashboard/summary'));
router.get('/dashboard/inbox', (req: Request, res: Response) => ok(res, '/dashboard/inbox'));
router.get('/dashboard/sent', (req: Request, res: Response) => ok(res, '/dashboard/sent'));
router.get('/dashboard/stats', (req: Request, res: Response) => ok(res, '/dashboard/stats'));

// Messages (6): CRUD + send + archive
router.post('/messages', (req: Request, res: Response) => ok(res, '/messages', { action: 'create' }));
router.get('/messages/:id', (req: Request, res: Response) => ok(res, `/messages/${req.params.id}`, { action: 'read' }));
router.put('/messages/:id', (req: Request, res: Response) => ok(res, `/messages/${req.params.id}`, { action: 'update' }));
router.delete('/messages/:id', (req: Request, res: Response) => ok(res, `/messages/${req.params.id}`, { action: 'delete' }));
router.post('/messages/send', (req: Request, res: Response) => ok(res, '/messages/send', { action: 'send' }));
router.post('/messages/:id/archive', (req: Request, res: Response) => ok(res, `/messages/${req.params.id}/archive`, { action: 'archive' }));

// Templates (4)
router.get('/templates', (req: Request, res: Response) => ok(res, '/templates'));
router.get('/templates/:id', (req: Request, res: Response) => ok(res, `/templates/${req.params.id}`));
router.post('/templates/create', (req: Request, res: Response) => ok(res, '/templates/create'));
router.get('/templates/variables', (req: Request, res: Response) => ok(res, '/templates/variables'));

// Auto-replies (4)
router.get('/auto-replies', (req: Request, res: Response) => ok(res, '/auto-replies'));
router.get('/auto-replies/:id', (req: Request, res: Response) => ok(res, `/auto-replies/${req.params.id}`));
router.post('/auto-replies/create', (req: Request, res: Response) => ok(res, '/auto-replies/create'));
router.post('/auto-replies/toggle', (req: Request, res: Response) => ok(res, '/auto-replies/toggle'));

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => ok(res, '/analytics'));
router.get('/analytics/response-time', (req: Request, res: Response) => ok(res, '/analytics/response-time'));
router.get('/analytics/satisfaction', (req: Request, res: Response) => ok(res, '/analytics/satisfaction'));

// Settings (2)
router.get('/settings', (req: Request, res: Response) => ok(res, '/settings', { method: 'GET' }));
router.put('/settings', (req: Request, res: Response) => ok(res, '/settings', { method: 'PUT' }));

// Utilities (4)
router.get('/health', (req: Request, res: Response) => ok(res, '/health'));
router.post('/export', (req: Request, res: Response) => ok(res, '/export'));
router.post('/import', (req: Request, res: Response) => ok(res, '/import'));
router.post('/bulk-send', (req: Request, res: Response) => ok(res, '/bulk-send'));

export default router;

