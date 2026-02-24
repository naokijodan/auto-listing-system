import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/languages', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'languages' }));
router.get('/dashboard/progress', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'progress' }));
router.get('/dashboard/quality', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'quality' }));

// Translations (6)
router.get('/translations', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'list' }));
router.get('/translations/:id', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'detail' }));
router.post('/translations', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'create' }));
router.put('/translations/:id', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'update' }));
router.post('/translations/bulk-translate', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'bulk-translate' }));
router.get('/translations/:id/history', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'history' }));

// Languages (4)
router.get('/languages', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'list' }));
router.get('/languages/:id', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'detail' }));
router.post('/languages', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'add' }));
router.delete('/languages/:id', (_req: Request, res: Response) => res.json({ section: 'languages', action: 'remove' }));

// Glossary (4)
router.get('/glossary', (_req: Request, res: Response) => res.json({ section: 'glossary', action: 'list' }));
router.get('/glossary/:id', (_req: Request, res: Response) => res.json({ section: 'glossary', action: 'detail' }));
router.post('/glossary', (_req: Request, res: Response) => res.json({ section: 'glossary', action: 'create' }));
router.put('/glossary/:id', (_req: Request, res: Response) => res.json({ section: 'glossary', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/translation-quality', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'translation-quality' }));
router.get('/analytics/language-coverage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'language-coverage' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

