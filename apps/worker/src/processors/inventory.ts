import { Job } from 'bullmq';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { InventoryJobPayload, InventoryJobResult } from '@als/schema';

/**
 * 在庫監視ジョブプロセッサー
 *
 * TODO Phase 4で実装:
 * - 仕入元サイトへのアクセス（住宅用プロキシ経由）
 * - 在庫・価格チェック
 * - 変更時のアクション（価格更新、出品取り下げ）
 */
export async function processInventoryJob(
  job: Job<InventoryJobPayload>
): Promise<InventoryJobResult> {
  const { productId, sourceUrl, currentHash, checkPrice, checkStock } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'inventory' });

  log.info({
    type: 'inventory_check_start',
    productId,
    sourceUrl,
    checkPrice,
    checkStock,
  });

  // 商品情報取得
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { listings: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  try {
    // TODO: Phase 4で実装
    // 1. 仕入元サイトにアクセス（住宅用プロキシ経由）
    // 2. 在庫状況をチェック
    // 3. 価格をチェック
    // 4. ハッシュ比較で変更検知
    // 5. 必要に応じてアクション実行

    // プレースホルダー
    const isAvailable = true;
    const currentPrice = product.price;
    const priceChanged = false;
    const hashChanged = false;
    const action = 'none' as const;

    log.info({
      type: 'inventory_check_complete',
      productId,
      isAvailable,
      priceChanged,
      action,
    });

    return {
      success: true,
      message: 'Inventory check placeholder',
      isAvailable,
      currentPrice,
      priceChanged,
      hashChanged,
      action,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({
      type: 'inventory_check_error',
      productId,
      error: error.message,
    });

    throw error;
  }
}
