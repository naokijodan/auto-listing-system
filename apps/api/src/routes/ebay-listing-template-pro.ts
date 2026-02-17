import { Router, Request, Response } from 'express'

const router = Router()

const THEME = 'teal-600'

const ok = (res: Response, data: any = {}, extra: any = {}) =>
  res.json({ ok: true, theme: THEME, ...data, ...extra, ts: new Date().toISOString() })

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => ok(res, { route: 'dashboard' }))
router.get('/dashboard/summary', (req: Request, res: Response) => ok(res, { route: 'dashboard/summary' }))
router.get('/dashboard/templates', (req: Request, res: Response) => ok(res, { route: 'dashboard/templates' }))
router.get('/dashboard/usage', (req: Request, res: Response) => ok(res, { route: 'dashboard/usage' }))
router.get('/dashboard/performance', (req: Request, res: Response) => ok(res, { route: 'dashboard/performance' }))

// Templates (6): CRUD + clone + preview (keeping to 6 total)
router.get('/templates', (req: Request, res: Response) => ok(res, { route: 'templates', items: [] }))
router.post('/templates', (req: Request, res: Response) => ok(res, { route: 'templates:create', created: req.body }))
router.put('/templates/:id', (req: Request, res: Response) => ok(res, { route: 'templates:update', id: req.params.id, update: req.body }))
router.delete('/templates/:id', (req: Request, res: Response) => ok(res, { route: 'templates:delete', id: req.params.id }))
router.post('/templates/:id/clone', (req: Request, res: Response) => ok(res, { route: 'templates:clone', id: req.params.id }))
router.get('/templates/:id/preview', (req: Request, res: Response) => ok(res, { route: 'templates:preview', id: req.params.id }))

// Categories (4)
router.get('/categories', (req: Request, res: Response) => ok(res, { route: 'categories', items: [] }))
router.get('/categories/:id', (req: Request, res: Response) => ok(res, { route: 'categories/:id', id: req.params.id }))
router.post('/categories/create', (req: Request, res: Response) => ok(res, { route: 'categories:create', body: req.body }))
router.post('/categories/organize', (req: Request, res: Response) => ok(res, { route: 'categories:organize', body: req.body }))

// Variables (4)
router.get('/variables', (req: Request, res: Response) => ok(res, { route: 'variables', items: [] }))
router.get('/variables/:id', (req: Request, res: Response) => ok(res, { route: 'variables/:id', id: req.params.id }))
router.post('/variables/create', (req: Request, res: Response) => ok(res, { route: 'variables:create', body: req.body }))
router.post('/variables/test', (req: Request, res: Response) => ok(res, { route: 'variables:test', body: req.body }))

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => ok(res, { route: 'analytics' }))
router.get('/analytics/usage', (req: Request, res: Response) => ok(res, { route: 'analytics/usage' }))
router.get('/analytics/effectiveness', (req: Request, res: Response) => ok(res, { route: 'analytics/effectiveness' }))

// Settings (2)
router.get('/settings', (req: Request, res: Response) => ok(res, { route: 'settings', settings: { defaultCategory: 'general' } }))
router.put('/settings', (req: Request, res: Response) => ok(res, { route: 'settings:update', updated: req.body }))

// Utilities (4)
router.get('/health', (req: Request, res: Response) => ok(res, { status: 'healthy' }))
router.post('/export', (req: Request, res: Response) => ok(res, { route: 'export' }))
router.post('/import', (req: Request, res: Response) => ok(res, { route: 'import' }))
router.post('/validate', (req: Request, res: Response) => ok(res, { route: 'validate' }))

export default router

