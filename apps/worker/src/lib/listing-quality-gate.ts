import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'listing-quality-gate' });

export interface QualityCheckResult {
  passed: boolean;
  hardBlocks: string[];
  softWarnings: string[];
}

// ASCII比率で英語らしさを判定（外部ライブラリ不要）
export function isLikelyEnglish(text: string): boolean {
  if (!text || text.length === 0) return false;
  const asciiChars = text.replace(/[\s\d\-\.,!?:;()\[\]\/&\+=@#\$%\^\*_~`"'|\\<>{}]/g, '');
  if (asciiChars.length === 0) return true; // 記号・数字のみ
  const englishChars = asciiChars.replace(/[^\x00-\x7F]/g, '');
  return englishChars.length / asciiChars.length >= 0.5;
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
  // 追加情報：processed/originalの区別（あれば警告強化に使用）
  processedImages?: string[];
  originalImages?: string[];
}): QualityCheckResult {
  const hardBlocks: string[] = [];
  const softWarnings: string[] = [];

  // 1. 画像実在チェック
  const hasAnyImages = !!(params.imageUrls && params.imageUrls.length > 0);
  if (!hasAnyImages) {
    hardBlocks.push('No images available. At least 1 image is required. [no_images_at_all]');
  } else {
    const processed = params.processedImages || [];
    const originals = params.originalImages || [];
    if (processed.length === 0 && originals.length > 0) {
      softWarnings.push('No processed images found, using original images. [no_processed_images]');
    }
  }

  // 2. タイトルの英語検証（ASCII比率 50% 未満でハードブロック）
  if (!params.title || params.title.trim() === '') {
    hardBlocks.push('Title is empty.');
  } else if (!isLikelyEnglish(params.title)) {
    hardBlocks.push('Title has not been translated (title_not_english).');
  }

  // 3. 価格チェック（ハードブロック）
  if (!params.price || params.price <= 0) {
    hardBlocks.push('Price must be greater than 0.');
  }

  // 4. 説明文の英語検証（ASCII比率 50% 未満でソフト警告）
  if (!params.description || params.description.trim() === '') {
    softWarnings.push('Description is empty.');
  } else if (!isLikelyEnglish(params.description)) {
    softWarnings.push('Description is likely not English (description_not_english).');
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
