/**
 * Phase 3-A: 出品テンプレートエンジン
 * カテゴリに基づくテンプレート自動選択と、Description生成
 */
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'template-engine' });

/**
 * カテゴリに基づいてeBay出品テンプレートを自動選択
 */
export async function findBestTemplate(ebayCategoryId: string): Promise<{
  templateId: string;
  name: string;
  itemSpecifics: Record<string, string[]>;
  descriptionTemplate: string | null;
  conditionId: string | null;
  fulfillmentPolicyId: string | null;
  paymentPolicyId: string | null;
  returnPolicyId: string | null;
} | null> {
  // 1. カテゴリ完全一致のテンプレートを検索
  const exact = await prisma.ebayListingTemplate.findFirst({
    where: { ebayCategoryId, isActive: true },
    orderBy: [{ isDefault: 'desc' }],
  });

  if (exact) {
    return {
      templateId: exact.id,
      name: exact.name,
      itemSpecifics: (exact.itemSpecifics as Record<string, string[]>) || {},
      descriptionTemplate: exact.descriptionTemplate,
      conditionId: exact.conditionId,
      fulfillmentPolicyId: exact.fulfillmentPolicyId,
      paymentPolicyId: exact.paymentPolicyId,
      returnPolicyId: exact.returnPolicyId,
    };
  }

  // 2. デフォルトテンプレートを検索
  const defaultTemplate = await prisma.ebayListingTemplate.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (defaultTemplate) {
    return {
      templateId: defaultTemplate.id,
      name: defaultTemplate.name,
      itemSpecifics: (defaultTemplate.itemSpecifics as Record<string, string[]>) || {},
      descriptionTemplate: defaultTemplate.descriptionTemplate,
      conditionId: defaultTemplate.conditionId,
      fulfillmentPolicyId: defaultTemplate.fulfillmentPolicyId,
      paymentPolicyId: defaultTemplate.paymentPolicyId,
      returnPolicyId: defaultTemplate.returnPolicyId,
    };
  }

  return null;
}

/**
 * Description生成テンプレートを適用
 * プレースホルダを商品データで置換する
 *
 * 利用可能なプレースホルダ:
 * {{title}} - 商品タイトル
 * {{description}} - 商品説明
 * {{brand}} - ブランド名
 * {{condition}} - コンディション
 * {{weight}} - 重量（g）
 * {{category}} - カテゴリ
 * {{attributes.XXX}} - 任意の属性値
 */
export function applyDescriptionTemplate(
  template: string,
  data: {
    title?: string;
    description?: string;
    brand?: string;
    condition?: string;
    weight?: number;
    category?: string;
    attributes?: Record<string, any>;
  }
): string {
  let result = template;

  // 基本フィールド置換
  result = result.replace(/\{\{title\}\}/g, data.title || '');
  result = result.replace(/\{\{description\}\}/g, data.description || '');
  result = result.replace(/\{\{brand\}\}/g, data.brand || '');
  result = result.replace(/\{\{condition\}\}/g, data.condition || '');
  result = result.replace(/\{\{weight\}\}/g, data.weight ? String(data.weight) : '');
  result = result.replace(/\{\{category\}\}/g, data.category || '');

  // 属性置換 {{attributes.XXX}}
  if (data.attributes) {
    result = result.replace(/\{\{attributes\.(\w+)\}\}/g, (_match, key) => {
      return data.attributes?.[key] != null ? String(data.attributes[key]) : '';
    });
  }

  // 未置換のプレースホルダを空文字に
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  // 連続改行の整理
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

