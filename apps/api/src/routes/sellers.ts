import { Router } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { AppError } from '../middleware/error-handler';
import { SourceType as PrismaSourceType } from '@rakuda/database';
import { SourceTypeSchema } from '@rakuda/schema';

const router = Router();

// Redis connection
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queues
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });

// Helpers
function detectSourceTypeFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host;
    if (host.includes('mercari')) return 'MERCARI';
    if (host.includes('yahoo.co.jp') && (u.pathname.includes('auction') || host.includes('auctions'))) return 'YAHOO_AUCTION';
    if (host.includes('paypay')) return 'YAHOO_FLEA';
    if (host.includes('rakuma')) return 'RAKUMA';
    if (host.includes('rakuten')) return 'RAKUTEN';
    if (host.includes('amazon')) return 'AMAZON';
  } catch {
    // ignore
  }
  return null;
}

function extractSellerId(url: string, sourceType: string): string | null {
  const st = sourceType.toUpperCase();
  try {
    if (st === 'MERCARI') {
      const m = url.match(/profile\/(\d+)/);
      return m ? m[1] : null;
    }
    if (st === 'YAHOO_AUCTION') {
      const m = url.match(/[?&]seller=([a-zA-Z0-9_\-]+)/) || url.match(/seller\/([a-zA-Z0-9_\-]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }
    if (st === 'YAHOO_FLEA') {
      const m = url.match(/user\/([a-zA-Z0-9_\-]+)/);
      return m ? m[1] : null;
    }
    if (st === 'RAKUMA') {
      const m = url.match(/user\/([a-zA-Z0-9_\-]+)/);
      return m ? m[1] : null;
    }
    if (st === 'RAKUTEN') {
      // Rakuten shop URL often contains shop name
      const m = url.match(/shop\/(?:info\/)?([a-zA-Z0-9_\-]+)/) || url.match(/\/([a-zA-Z0-9_\-]+)\/?$/);
      return m ? m[1] : null;
    }
    if (st === 'AMAZON') {
      // Amazon seller page patterns vary
      const m = url.match(/seller=([A-Z0-9]+)/) || url.match(/stores\/([A-Za-z0-9]+)/);
      return m ? m[1] : null;
    }
  } catch {
    // ignore
  }
  return null;
}

// GET /api/sellers - list with pagination, filters
router.get('/', async (req, res, next) => {
  try {
    const { search, sourceType, monitored, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: any = {};
    if (sourceType) where.sourceType = (sourceType as string).toUpperCase();
    if (monitored !== undefined) where.isMonitored = String(monitored) === 'true';
    if (search) {
      where.OR = [
        { sellerName: { contains: String(search), mode: 'insensitive' } },
        { sellerId: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.seller.count({ where }),
    ]);

    res.json({
      success: true,
      data: sellers,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sellers/:id - detail with batch job history
router.get('/:id', async (req, res, next) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.params.id },
      include: {
        batchJobs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!seller) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');

    res.json({ success: true, data: seller });
  } catch (error) {
    next(error);
  }
});

// POST /api/sellers - register seller (url + sourceType)
router.post('/', async (req, res, next) => {
  try {
    const { url, sourceType: rawSourceType } = req.body as { url?: string; sourceType?: string };
    if (!url) throw new AppError(400, 'url is required', 'INVALID_REQUEST');

    const detected = rawSourceType ? String(rawSourceType).toUpperCase() : detectSourceTypeFromUrl(url);
    if (!detected) throw new AppError(400, 'sourceType could not be determined', 'INVALID_SOURCE');

    const sourceType = SourceTypeSchema.parse(String(detected).toUpperCase());
    const sellerId = extractSellerId(url, sourceType);
    if (!sellerId) throw new AppError(400, 'Could not extract sellerId from URL', 'INVALID_URL');

    // Upsert seller
    const seller = await prisma.seller.upsert({
      where: { sourceType_sellerId: { sourceType: sourceType as unknown as PrismaSourceType, sellerId } },
      update: {
        sellerUrl: url,
      },
      create: {
        sourceType: sourceType as unknown as PrismaSourceType,
        sellerId,
        sellerUrl: url,
      },
    });

    res.status(201).json({ success: true, data: seller });
  } catch (error) {
    next(error);
  }
});

// POST /api/sellers/:id/scrape - enqueue bulk scrape
router.post('/:id/scrape', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { options = {}, priority = 0 } = req.body || {};

    const seller = await prisma.seller.findUnique({ where: { id } });
    if (!seller) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');

    const limit = options.limit ? Math.max(1, Math.min(500, Number(options.limit))) : 50;

    const job = await scrapeQueue.add(
      'scrape-seller',
      {
        url: seller.sellerUrl,
        sourceType: String(seller.sourceType).toUpperCase(),
        marketplace: Array.isArray(options.marketplace) ? options.marketplace : ['joom'],
        options: {
          processImages: options.processImages ?? true,
          translate: options.translate ?? true,
          removeBackground: options.removeBackground ?? true,
          limit,
        },
        priority,
        retryCount: 0,
      },
      {
        priority,
        attempts: 5,
        backoff: { type: 'exponential', delay: 30000 },
      }
    );

    // Create batch job record
    const batchJob = await prisma.sellerBatchJob.create({
      data: {
        sellerId: seller.id,
        jobId: job.id!,
        sourceType: seller.sourceType,
        sellerUrl: seller.sellerUrl,
        sellerName: seller.sellerName || undefined,
        limit,
        status: 'QUEUED',
        startedAt: new Date(),
      },
    });

    // Update lastScrapedAt
    await prisma.seller.update({ where: { id: seller.id }, data: { lastScrapedAt: new Date() } });

    logger.info({ type: 'seller_scrape_job_added', sellerId: seller.id, jobId: job.id });

    res.status(202).json({ success: true, message: 'Seller scrape job queued', data: { jobId: job.id, batchJob } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sellers/:id - delete seller
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Detach batch jobs
    await prisma.sellerBatchJob.updateMany({ where: { sellerId: id }, data: { sellerId: null } });

    await prisma.seller.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PATCH /api/sellers/:id/monitor - toggle monitoring on/off
router.patch('/:id/monitor', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isMonitored } = req.body || {};

    const current = await prisma.seller.findUnique({ where: { id } });
    if (!current) throw new AppError(404, 'Seller not found', 'SELLER_NOT_FOUND');

    const updated = await prisma.seller.update({
      where: { id },
      data: { isMonitored: typeof isMonitored === 'boolean' ? isMonitored : !current.isMonitored },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/sellers/batch-jobs - list batch jobs
router.get('/batch-jobs', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 20));

    const [jobs, total] = await Promise.all([
      prisma.sellerBatchJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { seller: { select: { id: true, sellerName: true, sourceType: true } } },
      }),
      prisma.sellerBatchJob.count({ where }),
    ]);

    res.json({ success: true, data: jobs, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    next(error);
  }
});

// GET /api/sellers/batch-jobs/:id - batch job detail with progress
router.get('/batch-jobs/:id', async (req, res, next) => {
  try {
    const jobRecord = await prisma.sellerBatchJob.findUnique({ where: { id: req.params.id }, include: { seller: true } });
    if (!jobRecord) throw new AppError(404, 'Batch job not found', 'BATCH_JOB_NOT_FOUND');

    let queueState: string | null = null;
    let progress: any = null;

    if (jobRecord.jobId) {
      try {
        const job = await scrapeQueue.getJob(jobRecord.jobId);
        if (job) {
          queueState = await job.getState();
          const progressKey = `rakuda:job:${jobRecord.jobId}:progress`;
          const progressData = await redis.get(progressKey);
          progress = progressData ? JSON.parse(progressData) : null;
        }
      } catch {
        // ignore
      }
    }

    res.json({ success: true, data: { ...jobRecord, queueState, progress } });
  } catch (error) {
    next(error);
  }
});

export default router;

