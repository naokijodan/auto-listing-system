import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'dashboard' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/scanned', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'scanned' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/errors', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'errors' })
);

// Scans (6)
router.get('/scans', (_req: Request, res: Response) =>
  res.json({ section: 'scans', action: 'list' })
);
router.get('/scans/:id', (_req: Request, res: Response) =>
  res.json({ section: 'scans', action: 'detail' })
);
router.post('/scans/scan', (_req: Request, res: Response) =>
  res.json({ section: 'scans', action: 'scan' })
);
router.post('/scans/verify', (_req: Request, res: Response) =>
  res.json({ section: 'scans', action: 'verify' })
);
router.post('/scans/bulk-scan', (_req: Request, res: Response) =>
  res.json({ section: 'scans', action: 'bulk-scan' })
);
router.get('/scans/history', (_req: Request, res: Response) =>
  res.json({ section: 'scans', action: 'history' })
);

// Products (4)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/:id/link', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'link' })
);
router.post('/products/:id/unlink', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'unlink' })
);

// Barcodes (4)
router.get('/barcodes', (_req: Request, res: Response) =>
  res.json({ section: 'barcodes', action: 'list' })
);
router.get('/barcodes/:id', (_req: Request, res: Response) =>
  res.json({ section: 'barcodes', action: 'detail' })
);
router.post('/barcodes/generate', (_req: Request, res: Response) =>
  res.json({ section: 'barcodes', action: 'generate' })
);
router.post('/barcodes/print', (_req: Request, res: Response) =>
  res.json({ section: 'barcodes', action: 'print' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/scan-accuracy', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'scan-accuracy' })
);
router.get('/analytics/throughput', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'throughput' })
);

// Settings (2)
router.get('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'get' })
);
router.put('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'put' })
);

// Utilities (4)
router.get('/health', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'health' })
);
router.post('/export', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'export' })
);
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

