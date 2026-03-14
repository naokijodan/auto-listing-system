import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';

const router = Router();

// Redis connection for BullMQ
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });

function buildSearchUrl(sourceType: string, keyword?: string): string | undefined {
  if (!keyword) return undefined;
  const k = encodeURIComponent(keyword.trim());
  const st = sourceType.toUpperCase();
  if (st === 'RAKUTEN') return `https://search.rakuten.co.jp/search/mall/${k}/`;
  if (st === 'AMAZON') return `https://www.amazon.co.jp/s?k=${k}`;
  return undefined;
}

// GET /api/search-collections - コレクション一覧
router.get('/', async (_req, res, next) => {
  try {
    const collections = await prisma.searchCollection.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: collections });
  } catch (err) {
    next(err);
  }
});

// GET /api/search-collections/:id - コレクション詳細（実行履歴含む）
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const collection = await prisma.searchCollection.findUnique({
      where: { id },
      include: {
        runs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: collection });
  } catch (err) {
    next(err);
  }
});

// POST /api/search-collections - 新規コレクション作成
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      sourceType,
      searchQuery,
      minPrice,
      maxPrice,
      category,
      brand,
      aiFilterEnabled = true,
      minConfidence = 0.7,
      autoApprove = false,
      isScheduled = false,
      scheduleCron,
      limit = 50,
    } = req.body || {};

    if (!name || !sourceType) {
      return res.status(400).json({ success: false, error: 'name and sourceType are required' });
    }

    const st = String(sourceType).toUpperCase();
    if (!['RAKUTEN', 'AMAZON'].includes(st)) {
      return res.status(400).json({ success: false, error: 'sourceType must be RAKUTEN or AMAZON' });
    }

    const searchUrl = buildSearchUrl(st, searchQuery);

    const created = await prisma.searchCollection.create({
      data: {
        name,
        sourceType: st as any,
        searchQuery: searchQuery ?? null,
        searchUrl: searchUrl ?? null,
        minPrice: minPrice ?? null,
        maxPrice: maxPrice ?? null,
        category: category ?? null,
        brand: brand ?? null,
        aiFilterEnabled,
        minConfidence,
        autoApprove,
        isScheduled,
        scheduleCron: scheduleCron ?? null,
        limit,
        status: 'ACTIVE',
      },
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/search-collections/:id - コレクション更新
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.searchCollection.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

    // 再計算: sourceType/searchQuery 変更時は searchUrl を再構築
    let searchUrl: string | undefined = existing.searchUrl || undefined;
    const newSourceType = (body.sourceType ? String(body.sourceType).toUpperCase() : existing.sourceType) as string;
    const newQuery = body.searchQuery !== undefined ? String(body.searchQuery) : existing.searchQuery || undefined;
    if (body.sourceType !== undefined || body.searchQuery !== undefined) {
      searchUrl = buildSearchUrl(newSourceType, newQuery);
    }

    const updated = await prisma.searchCollection.update({
      where: { id },
      data: {
        ...('name' in body ? { name: body.name } : {}),
        ...('sourceType' in body ? { sourceType: newSourceType as any } : {}),
        ...('searchQuery' in body ? { searchQuery: newQuery ?? null } : {}),
        ...(searchUrl !== undefined ? { searchUrl } : {}),
        ...('minPrice' in body ? { minPrice: body.minPrice ?? null } : {}),
        ...('maxPrice' in body ? { maxPrice: body.maxPrice ?? null } : {}),
        ...('category' in body ? { category: body.category ?? null } : {}),
        ...('brand' in body ? { brand: body.brand ?? null } : {}),
        ...('aiFilterEnabled' in body ? { aiFilterEnabled: !!body.aiFilterEnabled } : {}),
        ...('minConfidence' in body ? { minConfidence: Number(body.minConfidence) } : {}),
        ...('autoApprove' in body ? { autoApprove: !!body.autoApprove } : {}),
        ...('isScheduled' in body ? { isScheduled: !!body.isScheduled } : {}),
        ...('scheduleCron' in body ? { scheduleCron: body.scheduleCron ?? null } : {}),
        ...('limit' in body ? { limit: Number(body.limit) } : {}),
        ...('status' in body ? { status: String(body.status) } : {}),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/search-collections/:id - コレクション削除
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // 先に存在チェック
    const existing = await prisma.searchCollection.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

    // 関連ランを削除
    await prisma.searchCollectionRun.deleteMany({ where: { collectionId: id } });
    await prisma.searchCollection.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/search-collections/:id/run - 収集実行（BullMQジョブキュー）
router.post('/:id/run', async (req, res, next) => {
  try {
    const { id } = req.params;
    const collection = await prisma.searchCollection.findUnique({ where: { id } });
    if (!collection) return res.status(404).json({ success: false, error: 'Not found' });

    // ランを作成（Queued）
    const run = await prisma.searchCollectionRun.create({
      data: {
        collectionId: id,
        status: 'QUEUED',
        startedAt: null,
      },
    });

    // キューに追加
    const job = await scrapeQueue.add(
      'search-collection',
      {
        collectionId: id,
        runId: run.id,
      },
      {
        priority: 5,
        removeOnComplete: 1000,
        removeOnFail: 5000,
      }
    );

    // jobId を保存
    await prisma.searchCollectionRun.update({
      where: { id: run.id },
      data: { jobId: job.id || undefined },
    });

    res.status(202).json({ success: true, data: { runId: run.id, jobId: job.id } });
  } catch (err) {
    next(err);
  }
});

// GET /api/search-collections/:id/runs - 実行履歴
router.get('/:id/runs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const runs = await prisma.searchCollectionRun.findMany({
      where: { collectionId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: runs });
  } catch (err) {
    next(err);
  }
});

// GET /api/search-collections/:id/runs/:runId - 実行詳細
router.get('/:id/runs/:runId', async (req, res, next) => {
  try {
    const { id, runId } = req.params;
    const run = await prisma.searchCollectionRun.findFirst({
      where: { id: runId, collectionId: id },
    });
    if (!run) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: run });
  } catch (err) {
    next(err);
  }
});

export default router;

