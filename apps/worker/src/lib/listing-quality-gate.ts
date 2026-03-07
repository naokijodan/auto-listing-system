import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'listing-quality-gate' });

export interface QualityCheckResult {
  passed: boolean;
  hardBlocks: string[];
  softWarnings: string[];
}

/**
 * 出品前品質チェック
 * hardBlocksが1つでもある場合は出品不可
 */
export function checkListingQuality(params: {
  imageUrls: string[];
  title: string;
  description: string;
  price: number;
  itemSpecifics?: Record<string, string | string[]>;
  requiredSpecificsCount?: number;
}): QualityCheckResult {
  const hardBlocks: string[] = [];
  const softWarnings: string[] = [];

  // 1. 画像チェック（ハードブロック）
  if (!params.imageUrls || params.imageUrls.length === 0) {
    hardBlocks.push('No images available. At least 1 image is required.');
  }

  // 2. タイトル翻訳チェック（ハードブロック）
  if (!params.title || params.title.trim() === '') {
    hardBlocks.push('Title is empty.');
  } else if (params.title.startsWith('[EN]')) {
    hardBlocks.push('Title has not been translated (still has [EN] prefix).');
  }

  // 3. 価格チェック（ハードブロック）
  if (!params.price || params.price <= 0) {
    hardBlocks.push('Price must be greater than 0.');
  }

  // 4. 説明文翻訳チェック（ソフトブロック）
  if (!params.description || params.description.trim() === '') {
    softWarnings.push('Description is empty.');
  } else if (params.description.startsWith('[EN]')) {
    softWarnings.push('Description has not been translated (still has [EN] prefix).');
  }

  // 5. ItemSpecifics充足率チェック（ソフトブロック）
  if (params.itemSpecifics && params.requiredSpecificsCount) {
    const filledCount = Object.keys(params.itemSpecifics).length;
    const ratio = filledCount / params.requiredSpecificsCount;
    if (ratio < 0.8) {
      softWarnings.push(`ItemSpecifics coverage is ${Math.round(ratio * 100)}% (${filledCount}/${params.requiredSpecificsCount}). Recommended: 80%+`);
    }
  }

  const passed = hardBlocks.length === 0;

  if (!passed) {
    log.warn({
      type: 'quality_check_failed',
      hardBlocks,
      softWarnings,
      title: params.title?.substring(0, 50),
    });
  } else if (softWarnings.length > 0) {
    log.info({
      type: 'quality_check_warnings',
      softWarnings,
      title: params.title?.substring(0, 50),
    });
  }

  return { passed, hardBlocks, softWarnings };
}

