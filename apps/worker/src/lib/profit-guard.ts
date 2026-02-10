import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'profit-guard' });

// 利益計算結果
export interface ProfitCalculation {
  orderId?: string;
  listingId?: string;
  productId?: string;

  // 価格情報
  salePrice: number; // 売上（USD）
  salePriceJpy: number; // 売上（円）
  costPrice: number; // 仕入価格（円）
  shippingCost: number; // 送料（円）
  platformFee: number; // プラットフォーム手数料（円）
  paymentFee: number; // 決済手数料（円）

  // 利益
  profitJpy: number; // 利益（円）
  profitRate: number; // 利益率（%）

  // 判定
  isDangerous: boolean; // 赤字リスク
  reason?: string; // 判定理由
}

// 閾値設定
export interface ProfitThresholdConfig {
  minProfitRate: number;
  minProfitAmount: number;
  alertProfitRate: number;
  isDryRun: boolean;
}

/**
 * 閾値取得
 * 優先度: カテゴリ固有 > マーケットプレイス共通 > 全体デフォルト > ハードコード値
 */
export async function getProfitThreshold(
  marketplace: string,
  category?: string
): Promise<ProfitThresholdConfig> {
  // 1. カテゴリ固有の設定を検索
  // 2. マーケットプレイス共通設定を検索
  // 3. 全体デフォルト設定を検索
  // 4. ハードコードされたデフォルト値

  const threshold = await prisma.profitThreshold.findFirst({
    where: {
      OR: [
        { marketplace, category },
        { marketplace, category: null },
        { marketplace: 'ALL', category: null },
      ],
      isActive: true,
    },
    orderBy: [
      { category: 'desc' }, // カテゴリ固有を優先
      { marketplace: 'desc' }, // マーケットプレイス固有を優先
    ],
  });

  return {
    minProfitRate: threshold?.minProfitRate ?? 10,
    minProfitAmount: threshold?.minProfitAmount ?? 500,
    alertProfitRate: threshold?.alertProfitRate ?? 15,
    isDryRun: threshold?.isDryRun ?? true,
  };
}

/**
 * 為替レート取得
 */
async function getExchangeRate(): Promise<number> {
  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });
  // JPY → USD レートなので、USD → JPY に変換するには逆数を取る
  return rate ? 1 / rate.rate : 150;
}

/**
 * 利益計算
 */
export async function calculateProfit(params: {
  salePrice: number; // USD
  costPrice: number; // JPY
  shippingCost?: number; // JPY
  marketplace: string;
  exchangeRate?: number;
}): Promise<ProfitCalculation> {
  // 為替レート取得（デフォルト150円）
  const rate = params.exchangeRate || (await getExchangeRate());

  // 売上（円換算）
  const salePriceJpy = params.salePrice * rate;

  // 手数料計算（Joom: 15%, eBay: 12.9%）
  const feeRate = params.marketplace === 'JOOM' ? 0.15 : 0.129;
  const platformFee = salePriceJpy * feeRate;

  // 決済手数料（約3%）
  const paymentFee = salePriceJpy * 0.03;

  // 送料
  const shippingCost = params.shippingCost || 1500;

  // 利益計算
  const profitJpy =
    salePriceJpy - params.costPrice - shippingCost - platformFee - paymentFee;
  const profitRate = (profitJpy / params.costPrice) * 100;

  return {
    salePrice: params.salePrice,
    salePriceJpy,
    costPrice: params.costPrice,
    shippingCost,
    platformFee: Math.round(platformFee),
    paymentFee: Math.round(paymentFee),
    profitJpy: Math.round(profitJpy),
    profitRate: Math.round(profitRate * 10) / 10,
    isDangerous: false, // checkProfitで設定
  };
}

/**
 * 利益チェック（メイン関数）
 */
export async function checkProfit(params: {
  orderId?: string;
  listingId?: string;
  salePrice: number;
  costPrice: number;
  shippingCost?: number;
  marketplace: string;
  category?: string;
}): Promise<{
  allowed: boolean;
  calculation: ProfitCalculation;
  threshold: { minProfitRate: number; minProfitAmount: number };
}> {
  const startTime = Date.now();

  // 閾値取得
  const threshold = await getProfitThreshold(
    params.marketplace,
    params.category
  );

  // 利益計算
  const calculation = await calculateProfit({
    salePrice: params.salePrice,
    costPrice: params.costPrice,
    shippingCost: params.shippingCost,
    marketplace: params.marketplace,
  });

  // 判定
  const isBelowMinRate = calculation.profitRate < threshold.minProfitRate;
  const isBelowMinAmount = calculation.profitJpy < threshold.minProfitAmount;
  const isDangerous = isBelowMinRate || isBelowMinAmount;

  calculation.isDangerous = isDangerous;
  calculation.orderId = params.orderId;
  calculation.listingId = params.listingId;

  if (isDangerous) {
    calculation.reason = isBelowMinRate
      ? `利益率${calculation.profitRate}%が閾値${threshold.minProfitRate}%を下回っています`
      : `利益額${calculation.profitJpy}円が閾値${threshold.minProfitAmount}円を下回っています`;
  }

  // 判定結果の決定
  const allowed = threshold.isDryRun ? true : !isDangerous;
  const decision = isDangerous
    ? threshold.isDryRun
      ? 'hold'
      : 'reject'
    : 'approve';

  // ShadowLogに記録
  await prisma.shadowLog.create({
    data: {
      service: 'profit-guard',
      operation: 'check',
      input: {
        orderId: params.orderId,
        listingId: params.listingId,
        salePrice: params.salePrice,
        costPrice: params.costPrice,
        marketplace: params.marketplace,
      } as object,
      output: {
        ...calculation,
        reason: calculation.reason ?? null,
      } as object,
      decision,
      decisionReason: calculation.reason,
      isDryRun: threshold.isDryRun,
      durationMs: Date.now() - startTime,
    },
  });

  log.info({
    type: 'profit_check',
    orderId: params.orderId,
    listingId: params.listingId,
    profitJpy: calculation.profitJpy,
    profitRate: calculation.profitRate,
    isDangerous,
    decision,
    isDryRun: threshold.isDryRun,
    allowed,
  });

  return {
    allowed,
    calculation,
    threshold: {
      minProfitRate: threshold.minProfitRate,
      minProfitAmount: threshold.minProfitAmount,
    },
  };
}

/**
 * 注文の利益チェック
 */
export async function checkOrderProfit(orderId: string): Promise<{
  allowed: boolean;
  items: Array<{
    saleId: string;
    allowed: boolean;
    calculation: ProfitCalculation;
  }>;
  totalProfit: number;
  anyDangerous: boolean;
}> {
  // 注文と売上明細を取得
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { sales: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const results = [];
  let totalProfit = 0;
  let anyDangerous = false;

  for (const sale of order.sales) {
    const result = await checkProfit({
      orderId,
      listingId: sale.listingId || undefined,
      salePrice: sale.unitPrice,
      costPrice: sale.costPrice || 0,
      marketplace: order.marketplace,
    });

    results.push({
      saleId: sale.id,
      allowed: result.allowed,
      calculation: result.calculation,
    });

    totalProfit += result.calculation.profitJpy;
    if (result.calculation.isDangerous) {
      anyDangerous = true;
    }
  }

  return {
    allowed: results.every((r) => r.allowed),
    items: results,
    totalProfit,
    anyDangerous,
  };
}

/**
 * 出品前の利益チェック（シミュレーション用）
 */
export async function simulateProfitCheck(params: {
  listingPrice: number; // USD
  costPrice: number; // JPY
  shippingCost?: number; // JPY
  marketplace: string;
  category?: string;
}): Promise<{
  isProfiable: boolean;
  calculation: ProfitCalculation;
  recommendation?: {
    minListingPrice: number;
    suggestedPrice: number;
  };
}> {
  const result = await checkProfit({
    salePrice: params.listingPrice,
    costPrice: params.costPrice,
    shippingCost: params.shippingCost,
    marketplace: params.marketplace,
    category: params.category,
  });

  let recommendation;

  if (!result.allowed || result.calculation.isDangerous) {
    // 利益が出る最低価格を計算
    const rate = await getExchangeRate();
    const threshold = await getProfitThreshold(
      params.marketplace,
      params.category
    );

    // 目標利益額から逆算
    const targetProfit = Math.max(
      threshold.minProfitAmount,
      params.costPrice * (threshold.minProfitRate / 100)
    );

    const shippingCost = params.shippingCost || 1500;
    const feeRate = params.marketplace === 'JOOM' ? 0.15 : 0.129;
    const paymentFeeRate = 0.03;

    // 必要な売上（円）= (仕入 + 送料 + 利益) / (1 - 手数料率)
    const requiredSalesJpy =
      (params.costPrice + shippingCost + targetProfit) /
      (1 - feeRate - paymentFeeRate);

    // USD に変換
    const minListingPrice = Math.ceil((requiredSalesJpy / rate) * 100) / 100;

    // 推奨価格（最低価格 + 5%）
    const suggestedPrice = Math.ceil(minListingPrice * 1.05 * 100) / 100;

    recommendation = {
      minListingPrice,
      suggestedPrice,
    };
  }

  return {
    isProfiable: result.allowed && !result.calculation.isDangerous,
    calculation: result.calculation,
    recommendation,
  };
}

/**
 * バッチで複数商品の利益チェック
 */
export async function batchCheckProfit(
  items: Array<{
    id: string;
    salePrice: number;
    costPrice: number;
    shippingCost?: number;
    marketplace: string;
    category?: string;
  }>
): Promise<{
  results: Array<{
    id: string;
    allowed: boolean;
    calculation: ProfitCalculation;
  }>;
  summary: {
    total: number;
    approved: number;
    rejected: number;
    dangerous: number;
    totalProfit: number;
    averageProfitRate: number;
  };
}> {
  const results = [];
  let totalProfit = 0;
  let totalProfitRate = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let dangerousCount = 0;

  for (const item of items) {
    const result = await checkProfit({
      listingId: item.id,
      salePrice: item.salePrice,
      costPrice: item.costPrice,
      shippingCost: item.shippingCost,
      marketplace: item.marketplace,
      category: item.category,
    });

    results.push({
      id: item.id,
      allowed: result.allowed,
      calculation: result.calculation,
    });

    totalProfit += result.calculation.profitJpy;
    totalProfitRate += result.calculation.profitRate;

    if (result.allowed) {
      approvedCount++;
    } else {
      rejectedCount++;
    }

    if (result.calculation.isDangerous) {
      dangerousCount++;
    }
  }

  return {
    results,
    summary: {
      total: items.length,
      approved: approvedCount,
      rejected: rejectedCount,
      dangerous: dangerousCount,
      totalProfit,
      averageProfitRate:
        items.length > 0
          ? Math.round((totalProfitRate / items.length) * 10) / 10
          : 0,
    },
  };
}
