import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/translated', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'translated' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/languages', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'languages' }));

// Translations (6)
router.get('/translations', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'list' }));
router.get('/translations/:id', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'detail' }));
router.post('/translations/:id/translate', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'translate' }));
router.post('/translations/bulk-translate', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'bulk-translate' }));
router.post('/translations/:id/review', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'review' }));
router.post('/translations/:id/approve', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'approve' }));

// Languages (4)
router.get('/languages', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'list' }));
router.get('/languages/:id', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'detail' }));
router.post('/languages/:id/configure', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'configure' }));
router.get('/languages/:id/glossary', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'glossary' }));

// Quality (4)
router.get('/quality', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'list' }));
router.get('/quality/:id', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'detail' }));
router.post('/quality/:id/check', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'check' }));
router.post('/quality/:id/improve', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'improve' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/coverage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'coverage' }));
router.get('/analytics/quality-score', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'quality-score' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

