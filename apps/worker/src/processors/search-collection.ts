import { Job } from 'bullmq';
import { prisma, SourceType as PrismaSourceType } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { scrapeRakutenShop, scrapeAmazonSearch } from '../lib/scrapers';
import { enrichProductFull } from '@rakuda/enrichment';
import { addEnrichProductJob } from '@rakuda/queue';

interface SearchCollectionJobData {
  collectionId: string;
  runId?: string;
}

export async function processSearchCollectionJob(job: Job<SearchCollectionJobData>): Promise<any> {
  const { collectionId, runId } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'search-collection', collectionId, runId });

  try {
    const collection = await prisma.searchCollection.findUnique({ where: { id: collectionId } });
    if (!collection) {
      throw new Error(`SearchCollection not found: ${collectionId}`);
    }

    if (runId) {
      await prisma.searchCollectionRun.update({
        where: { id: runId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      });
    }

    // Resolve search URL
    const keyword = collection.searchQuery || '';
    const st = String(collection.sourceType).toUpperCase();
    const searchUrl = collection.searchUrl || (st === 'RAKUTEN'
      ? `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
      : st === 'AMAZON'
      ? `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`
      : undefined);

    if (!searchUrl) {
      throw new Error('searchUrl could not be resolved');
    }

    const limit = collection.limit || 50;
    log.info({ type: 'search_collection_start', sourceType: st, searchUrl, limit });

    // Scrape products
    const scraped = st === 'RAKUTEN'
      ? await scrapeRakutenShop(searchUrl, limit)
      : st === 'AMAZON'
      ? await scrapeAmazonSearch(searchUrl, Math.min(limit, 50))
      : { success: false, error: `Unsupported sourceType: ${st}` };

    if (!scraped.success) {
      throw new Error(scraped.error || 'Scraping failed');
    }

    const products = scraped.products || [];

    // Counters
    let created = 0;
    let filtered = 0; // AI除外
    let approved = 0; // 自動承認

    // Ensure Source row exists
    let source = await prisma.source.findFirst({ where: { type: st as PrismaSourceType } });
    if (!source) {
      source = await prisma.source.create({ data: { type: st as PrismaSourceType, name: st } });
    }

    for (const p of products) {
      try {
        // Filters
        if (collection.minPrice && p.price < collection.minPrice) continue;
        if (collection.maxPrice && p.price > collection.maxPrice) continue;
        if (collection.category && p.category && !String(p.category).includes(collection.category)) continue;
        if (collection.brand && p.brand && !String(p.brand).includes(collection.brand)) continue;

        // Deduplicate
        const existing = await prisma.product.findUnique({
          where: { sourceId_sourceItemId: { sourceId: source.id, sourceItemId: p.sourceItemId } },
        });
        if (existing) continue;

        // Create product
        const product = await prisma.product.create({
          data: {
            sourceId: source.id,
            sourceItemId: p.sourceItemId,
            sourceUrl: p.sourceUrl,
            title: p.title,
            description: p.description || '',
            price: p.price || 0,
            images: (p.images as any) || [],
            processedImages: [],
            category: p.category || null,
            brand: p.brand || null,
            condition: p.condition || null,
            sellerId: (p as any).sellerId || null,
            sellerName: (p as any).sellerName || null,
            scrapedAt: new Date(),
            status: 'PENDING_SCRAPE',
          },
        });
        created++;

        // AI選別（有効時）
        if (collection.aiFilterEnabled) {
          try {
            const enrichment = await enrichProductFull(product.title, product.description, product.category || undefined);
            const confidence = enrichment.attributes.confidence ?? 0;
            let newStatus: 'READY_TO_REVIEW' | 'APPROVED' | 'ERROR' = 'READY_TO_REVIEW';
            let rejectedByAi = false;

            if (enrichment.validation.status === 'rejected') {
              newStatus = 'ERROR';
              rejectedByAi = true;
            } else if (confidence < (collection.minConfidence || 0)) {
              // 信頼度不足で除外
              newStatus = 'ERROR';
              rejectedByAi = true;
            } else if (collection.autoApprove) {
              newStatus = 'APPROVED';
            } else {
              newStatus = 'READY_TO_REVIEW';
            }

            // Update product with enrichment results
            await prisma.product.update({
              where: { id: product.id },
              data: {
                titleEn: enrichment.translations.en.title,
                descriptionEn: enrichment.translations.en.description,
                attributes: {
                  brand: enrichment.attributes.brand ?? null,
                  model: enrichment.attributes.model ?? null,
                  color: enrichment.attributes.color ?? null,
                  size: enrichment.attributes.size ?? null,
                  material: enrichment.attributes.material ?? null,
                  condition: enrichment.attributes.condition ?? null,
                  category: enrichment.attributes.category ?? null,
                  itemSpecifics: enrichment.attributes.itemSpecifics,
                  confidence,
                  validation: enrichment.validation,
                } as any,
                translationStatus: enrichment.translations.en.title ? 'COMPLETED' : 'ERROR',
                status: newStatus as any,
                lastError: rejectedByAi ? `AI filtered: ${enrichment.validation.flags?.join(', ') || 'low confidence'}` : null,
              },
            });

            if (rejectedByAi) filtered++;
            if (newStatus === 'APPROVED') approved++;

            // 後続の詳細エンリッチメントをキューへ
            await addEnrichProductJob(product.id, 0);
          } catch (e: any) {
            // エンリッチ失敗時はジョブだけ追加
            await addEnrichProductJob(product.id, 0);
          }
        }
      } catch (e: any) {
        // 個別商品のエラーは継続
        log.warn({ type: 'item_process_error', error: e.message });
      }
    }

    // Update run & collection stats
    const productsFound = products.length;
    if (runId) {
      await prisma.searchCollectionRun.update({
        where: { id: runId },
        data: {
          productsFound,
          created,
          filtered,
          approved,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    await prisma.searchCollection.update({
      where: { id: collectionId },
      data: {
        totalCollected: { increment: created },
        totalApproved: { increment: approved },
        totalRejected: { increment: filtered },
        lastRunAt: new Date(),
      },
    });

    log.info({ type: 'search_collection_complete', productsFound, created, filtered, approved });
    return { productsFound, created, filtered, approved };
  } catch (error: any) {
    if (job.data.runId) {
      await prisma.searchCollectionRun.update({
        where: { id: job.data.runId },
        data: { status: 'FAILED', errorMessage: error.message, completedAt: new Date() },
      }).catch(() => undefined);
    }
    throw error;
  }
}

