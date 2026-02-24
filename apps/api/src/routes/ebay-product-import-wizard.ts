import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Phase 540: Product Import Wizard — Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'root' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/failed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'failed' }));
router.get('/dashboard/success-rate', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'success-rate' }));

// Imports (6)
router.get('/imports', (_req: Request, res: Response) => res.json({ section: 'imports', action: 'list' }));
router.get('/imports/:id', (_req: Request, res: Response) => res.json({ section: 'imports', action: 'detail' }));
router.post('/imports', (_req: Request, res: Response) => res.json({ section: 'imports', action: 'create' }));
router.post('/imports/:id/validate', (_req: Request, res: Response) => res.json({ section: 'imports', action: 'validate' }));
router.post('/imports/:id/execute', (_req: Request, res: Response) => res.json({ section: 'imports', action: 'execute' }));
router.get('/imports/:id/history', (_req: Request, res: Response) => res.json({ section: 'imports', action: 'history' }));

// Mappings (4)
router.get('/mappings', (_req: Request, res: Response) => res.json({ section: 'mappings', action: 'list' }));
router.get('/mappings/:id', (_req: Request, res: Response) => res.json({ section: 'mappings', action: 'detail' }));
router.post('/mappings', (_req: Request, res: Response) => res.json({ section: 'mappings', action: 'create' }));
router.put('/mappings/:id', (_req: Request, res: Response) => res.json({ section: 'mappings', action: 'update' }));

// Sources (4)
router.get('/sources', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'list' }));
router.get('/sources/:id', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'detail' }));
router.post('/sources/:id/connect', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'connect' }));
router.post('/sources/:id/test', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'test' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/import-volume', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'import-volume' }));
router.get('/analytics/error-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'error-distribution' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

