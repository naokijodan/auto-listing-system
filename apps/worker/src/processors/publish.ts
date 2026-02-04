import { Job } from 'bullmq';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { PublishJobPayload, PublishJobResult } from '@als/schema';

/**
 * 出品ジョブプロセッサー
 *
 * TODO Phase 2/3で実装:
 * - Joom API 連携
 * - eBay API 連携
 */
export async function processPublishJob(
  job: Job<PublishJobPayload>
): Promise<PublishJobResult> {
  const { productId, listingId, marketplace, listingData, isDryRun } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'publish' });

  log.info({
    type: 'publish_start',
    productId,
    listingId,
    marketplace,
    isDryRun,
  });

  // 出品情報取得
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { product: true },
  });

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  // ステータス更新
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: 'PUBLISHING' },
  });

  await prisma.product.update({
    where: { id: productId },
    data: { status: 'PUBLISHING' },
  });

  try {
    let marketplaceListingId: string | undefined;
    let listingUrl: string | undefined;

    if (isDryRun) {
      log.info({ type: 'dry_run', message: 'Skipping actual publish' });
      marketplaceListingId = `dry-run-${Date.now()}`;
    } else {
      // TODO: Phase 2/3で実装
      // marketplace に応じて API を呼び出し

      if (marketplace === 'joom') {
        // TODO: Joom API 実装
        log.info({ type: 'joom_publish_placeholder' });
        marketplaceListingId = `joom-placeholder-${Date.now()}`;
      } else if (marketplace === 'ebay') {
        // TODO: eBay API 実装
        log.info({ type: 'ebay_publish_placeholder' });
        marketplaceListingId = `ebay-placeholder-${Date.now()}`;
      }
    }

    // ステータス更新
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        marketplaceListingId,
        listedAt: new Date(),
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { status: 'ACTIVE' },
    });

    log.info({
      type: 'publish_complete',
      listingId,
      marketplaceListingId,
    });

    return {
      success: true,
      message: 'Publish placeholder',
      marketplaceListingId,
      listingUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ERROR',
        errorMessage: error.message,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'ERROR',
        lastError: error.message,
      },
    });

    throw error;
  }
}
