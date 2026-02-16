import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ========================================
// スキーマ定義
// ========================================

const createSavedSearchSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(['PRODUCT', 'ORDER', 'LISTING', 'CUSTOMER', 'SHIPMENT', 'SUPPLIER', 'INVENTORY']),
  filters: z.record(z.any()).default({}),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  columns: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  isShared: z.boolean().default(false),
});

const searchQuerySchema = z.object({
  entityType: z.enum(['PRODUCT', 'ORDER', 'LISTING', 'CUSTOMER', 'SHIPMENT', 'SUPPLIER', 'INVENTORY']),
  query: z.string().optional(),
  filters: z.record(z.any()).default({}),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ========================================
// 統計情報
// ========================================

router.get('/stats', async (req: Request, res: Response) => {
  try {
    res.json({
      totalSearches: 10000,
      savedSearches: 50,
      recentSearches: 100,
      popularFilters: ['category', 'price', 'status'],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch search stats' });
  }
});

// ========================================
// 検索実行
// ========================================

router.post('/execute', async (req: Request, res: Response) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid search query', details: parsed.error.issues });
    }

    res.json({
      results: [
        { id: '1', type: parsed.data.entityType, title: 'Result 1', score: 0.95 },
        { id: '2', type: parsed.data.entityType, title: 'Result 2', score: 0.85 },
        { id: '3', type: parsed.data.entityType, title: 'Result 3', score: 0.75 },
      ],
      total: 100,
      page: parsed.data.page,
      limit: parsed.data.limit,
      query: parsed.data.query,
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { q, entityType } = req.query;

    res.json({
      suggestions: [
        `${q} suggestion 1`,
        `${q} suggestion 2`,
        `${q} suggestion 3`,
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// ========================================
// 保存済み検索
// ========================================

router.get('/saved', async (req: Request, res: Response) => {
  try {
    res.json({
      searches: [
        { id: '1', name: 'My Products', entityType: 'PRODUCT', isDefault: true },
        { id: '2', name: 'Active Orders', entityType: 'ORDER', isDefault: false },
      ],
      total: 2,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get saved searches' });
  }
});

router.post('/saved', async (req: Request, res: Response) => {
  try {
    const parsed = createSavedSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid saved search', details: parsed.error.issues });
    }

    res.status(201).json({
      id: `saved_${Date.now()}`,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save search' });
  }
});

router.get('/saved/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    res.json({
      id,
      name: 'Saved Search',
      entityType: 'PRODUCT',
      filters: {},
      isDefault: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get saved search' });
  }
});

router.put('/saved/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = createSavedSearchSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid update', details: parsed.error.issues });
    }

    res.json({
      id,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update saved search' });
  }
});

router.delete('/saved/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    res.json({ success: true, deletedId: id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// ========================================
// 検索履歴
// ========================================

router.get('/history', async (req: Request, res: Response) => {
  try {
    res.json({
      history: [
        { id: '1', query: 'search 1', entityType: 'PRODUCT', timestamp: new Date().toISOString() },
        { id: '2', query: 'search 2', entityType: 'ORDER', timestamp: new Date().toISOString() },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

router.delete('/history', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, message: 'Search history cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear search history' });
  }
});

// ========================================
// フィルター定義
// ========================================

router.get('/filters/:entityType', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;

    res.json({
      filters: [
        { field: 'status', type: 'ENUM', options: ['ACTIVE', 'INACTIVE', 'PENDING'] },
        { field: 'price', type: 'NUMBER', min: 0, max: 100000 },
        { field: 'createdAt', type: 'DATE' },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get filters' });
  }
});

// ========================================
// エクスポート
// ========================================

router.post('/export', async (req: Request, res: Response) => {
  try {
    res.json({
      jobId: `export_${Date.now()}`,
      status: 'STARTED',
      format: req.body.format || 'csv',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start export' });
  }
});

router.get('/export/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    res.json({
      jobId,
      status: 'COMPLETED',
      downloadUrl: `/api/downloads/${jobId}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get export status' });
  }
});

// ========================================
// 設定
// ========================================

router.get('/settings', async (req: Request, res: Response) => {
  try {
    res.json({
      defaultPageSize: 20,
      maxPageSize: 100,
      enableFuzzySearch: true,
      defaultSortOrder: 'desc',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get search settings' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    res.json({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update search settings' });
  }
});

export { router as advancedSearchRouter };
