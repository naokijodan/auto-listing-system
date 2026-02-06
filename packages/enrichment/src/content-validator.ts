/**
 * Phase 40-A: コンテンツバリデーター
 * 禁制品チェック・商標侵害リスク判定
 */
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'enrichment/content-validator' });

/**
 * 検証ステータス
 */
export type ValidationStatus = 'approved' | 'rejected' | 'review_required';

/**
 * 検証結果
 */
export interface ValidationResult {
  status: ValidationStatus;
  passed: boolean;
  flags: string[];
  reviewNotes?: string;
  riskScore: number; // 0-100
}

/**
 * リスクカテゴリ
 */
export interface RiskCategory {
  keywords: string[];
  status: ValidationStatus;
  flagName: string;
  description: string;
}

/**
 * 禁制品キーワード（即座にrejected）
 */
const PROHIBITED_ITEMS: RiskCategory[] = [
  {
    keywords: ['リチウムイオン', 'リチウム電池', 'Li-ion', 'LiPo', 'リポ', 'モバイルバッテリー'],
    status: 'rejected',
    flagName: 'lithium_battery',
    description: 'リチウムイオン電池を含む製品は航空輸送禁止',
  },
  {
    keywords: ['ボタン電池', 'コイン電池', 'CR2032', 'LR44'],
    status: 'rejected',
    flagName: 'button_battery',
    description: 'ボタン電池は航空輸送禁止',
  },
  {
    keywords: ['可燃', '引火', 'ガソリン', 'アルコール', 'シンナー', 'ベンジン'],
    status: 'rejected',
    flagName: 'flammable',
    description: '可燃物は航空輸送禁止',
  },
  {
    keywords: ['スプレー缶', 'エアゾール', 'ガス缶', '殺虫剤'],
    status: 'rejected',
    flagName: 'aerosol',
    description: 'スプレー缶は航空輸送禁止',
  },
  {
    keywords: ['象牙', 'べっ甲', 'ワニ革', 'クロコダイル', 'オーストリッチ', 'パイソン', 'リザード'],
    status: 'rejected',
    flagName: 'cites',
    description: 'ワシントン条約(CITES)対象品',
  },
  {
    keywords: ['ナイフ', '包丁', '刃物', '銃', '武器', 'エアガン', 'モデルガン'],
    status: 'rejected',
    flagName: 'weapon',
    description: '武器・刃物類',
  },
  {
    keywords: ['アダルト', '18禁', 'R-18', 'エロ', 'ポルノ', '成人向け'],
    status: 'rejected',
    flagName: 'adult',
    description: 'アダルト商品',
  },
  {
    keywords: ['偽物', 'レプリカ', 'コピー品', 'パチモン', 'ノンブランド'],
    status: 'rejected',
    flagName: 'counterfeit',
    description: '偽造品・コピー品',
  },
  {
    keywords: ['麻薬', '覚醒剤', '大麻', 'CBD', 'THC', '脱法ドラッグ'],
    status: 'rejected',
    flagName: 'drugs',
    description: '規制薬物',
  },
];

/**
 * 要確認キーワード（review_required）
 */
const REVIEW_REQUIRED_ITEMS: RiskCategory[] = [
  {
    keywords: ['ROLEX', 'ロレックス', 'CHANEL', 'シャネル', 'HERMES', 'エルメス', 'LOUIS VUITTON', 'ルイヴィトン'],
    status: 'review_required',
    flagName: 'high_value_brand',
    description: '高額ブランド品は真贋確認が必要',
  },
  {
    keywords: ['ジェネリック', 'サプリメント', '健康食品', 'ビタミン', 'プロテイン'],
    status: 'review_required',
    flagName: 'supplement',
    description: '医薬品・サプリメントは規制確認が必要',
  },
  {
    keywords: ['化粧品', 'コスメ', '香水', 'パフューム', 'スキンケア'],
    status: 'review_required',
    flagName: 'cosmetics',
    description: '化粧品は成分確認が必要',
  },
  {
    keywords: ['電池式', '乾電池', '単三', '単四', 'アルカリ電池'],
    status: 'review_required',
    flagName: 'battery_operated',
    description: '電池使用製品は電池の種類確認が必要',
  },
  {
    keywords: ['食品', '食べ物', 'お菓子', 'スナック', '飲料'],
    status: 'review_required',
    flagName: 'food',
    description: '食品は輸入規制確認が必要',
  },
  {
    keywords: ['植物', '種子', 'シード', '花', '苗'],
    status: 'review_required',
    flagName: 'plant',
    description: '植物・種子は検疫確認が必要',
  },
  {
    keywords: ['動物', 'ペット用品', '毛皮', 'ファー'],
    status: 'review_required',
    flagName: 'animal_product',
    description: '動物製品は規制確認が必要',
  },
  {
    keywords: ['医療機器', '医療用', '血圧計', '体温計', 'パルスオキシメーター'],
    status: 'review_required',
    flagName: 'medical_device',
    description: '医療機器は認証確認が必要',
  },
  {
    keywords: ['アンティーク', '骨董', '100年', '19世紀', '18世紀'],
    status: 'review_required',
    flagName: 'antique',
    description: 'アンティーク品は文化財規制確認が必要',
  },
];

/**
 * キーワードベースの禁制品チェック（高速）
 */
export function validateContent(
  title: string,
  description: string,
  category?: string
): ValidationResult {
  const combinedText = `${title} ${description} ${category || ''}`.toLowerCase();
  const flags: string[] = [];
  let status: ValidationStatus = 'approved';
  let riskScore = 0;

  // 禁制品チェック
  for (const item of PROHIBITED_ITEMS) {
    for (const keyword of item.keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        flags.push(item.flagName);
        status = 'rejected';
        riskScore = 100;
        log.warn({
          type: 'prohibited_item_detected',
          keyword,
          flag: item.flagName,
          description: item.description,
        });
        break;
      }
    }
    if (status === 'rejected') break;
  }

  // 要確認チェック（まだrejectedでない場合）
  if (status !== 'rejected') {
    for (const item of REVIEW_REQUIRED_ITEMS) {
      for (const keyword of item.keywords) {
        if (combinedText.includes(keyword.toLowerCase())) {
          if (!flags.includes(item.flagName)) {
            flags.push(item.flagName);
            riskScore = Math.max(riskScore, 50);
          }
          if (status === 'approved') {
            status = 'review_required';
          }
          log.info({
            type: 'review_required_detected',
            keyword,
            flag: item.flagName,
            description: item.description,
          });
        }
      }
    }
  }

  const reviewNotes = flags.length > 0
    ? generateReviewNotes(flags)
    : undefined;

  return {
    status,
    passed: status === 'approved',
    flags,
    reviewNotes,
    riskScore,
  };
}

/**
 * レビューノートを生成
 */
function generateReviewNotes(flags: string[]): string {
  const notes: string[] = [];

  for (const flag of flags) {
    const prohibited = PROHIBITED_ITEMS.find(i => i.flagName === flag);
    if (prohibited) {
      notes.push(`[禁止] ${prohibited.description}`);
      continue;
    }

    const review = REVIEW_REQUIRED_ITEMS.find(i => i.flagName === flag);
    if (review) {
      notes.push(`[要確認] ${review.description}`);
    }
  }

  return notes.join('\n');
}

/**
 * AI検証結果とルールベース検証結果をマージ
 */
export function mergeValidation(
  aiValidation: Partial<ValidationResult>,
  ruleValidation: ValidationResult
): ValidationResult {
  // より厳しい判定を採用
  const statusPriority: Record<ValidationStatus, number> = {
    rejected: 3,
    review_required: 2,
    approved: 1,
  };

  const aiStatus = aiValidation.status || 'approved';
  const aiPriority = statusPriority[aiStatus];
  const rulePriority = statusPriority[ruleValidation.status];

  const finalStatus = aiPriority > rulePriority ? aiStatus : ruleValidation.status;
  const flags = [...new Set([...ruleValidation.flags, ...(aiValidation.flags || [])])];
  const riskScore = Math.max(aiValidation.riskScore || 0, ruleValidation.riskScore);

  const reviewNotes = [
    ruleValidation.reviewNotes,
    aiValidation.reviewNotes,
  ].filter(Boolean).join('\n\n');

  return {
    status: finalStatus,
    passed: finalStatus === 'approved',
    flags,
    reviewNotes: reviewNotes || undefined,
    riskScore,
  };
}

/**
 * 商品が出品可能かどうかを判定
 */
export function canPublish(validation: ValidationResult): boolean {
  return validation.status === 'approved';
}

/**
 * 商品が人間のレビューが必要かどうかを判定
 */
export function needsReview(validation: ValidationResult): boolean {
  return validation.status === 'review_required';
}

/**
 * 商品が出品禁止かどうかを判定
 */
export function isProhibited(validation: ValidationResult): boolean {
  return validation.status === 'rejected';
}

/**
 * フラグの説明を取得
 */
export function getFlagDescription(flag: string): string | undefined {
  const prohibited = PROHIBITED_ITEMS.find(i => i.flagName === flag);
  if (prohibited) return prohibited.description;

  const review = REVIEW_REQUIRED_ITEMS.find(i => i.flagName === flag);
  if (review) return review.description;

  return undefined;
}

/**
 * すべてのフラグとその説明を取得
 */
export function getAllFlags(): Array<{ flag: string; status: ValidationStatus; description: string }> {
  const prohibited = PROHIBITED_ITEMS.map(i => ({
    flag: i.flagName,
    status: i.status,
    description: i.description,
  }));

  const review = REVIEW_REQUIRED_ITEMS.map(i => ({
    flag: i.flagName,
    status: i.status,
    description: i.description,
  }));

  return [...prohibited, ...review];
}
