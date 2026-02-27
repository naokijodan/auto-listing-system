/**
 * A/Bテストエンジン
 * Phase 77: A/Bテスト機能
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

// 統計的有意性の判定
interface SignificanceResult {
  isSignificant: boolean;
  pValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  lift: number; // 改善率
  liftConfidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * A/Bテストを作成
 */
export async function createABTest(data: {
  name: string;
  description?: string;
  testType: string;
  targetEntity: string;
  targetField: string;
  filters?: Record<string, unknown>;
  trafficPercent?: number;
  startAt: Date;
  endAt?: Date;
  primaryMetric?: string;
  secondaryMetrics?: string[];
  minSampleSize?: number;
  confidenceLevel?: number;
  variants: Array<{
    name: string;
    isControl: boolean;
    changes: Record<string, unknown>;
    weight?: number;
  }>;
}) {
  // バリアントの重み合計が100になるように正規化
  const totalWeight = data.variants.reduce((sum, v) => sum + (v.weight || 50), 0);
  const normalizedVariants = data.variants.map(v => ({
    ...v,
    weight: Math.round(((v.weight || 50) / totalWeight) * 100),
  }));

  const test = await prisma.aBTest.create({
    data: {
      name: data.name,
      description: data.description,
      testType: data.testType as any,
      targetEntity: data.targetEntity,
      targetField: data.targetField,
      filters: (data.filters || {}) as any,
      trafficPercent: data.trafficPercent || 100,
      startAt: data.startAt,
      endAt: data.endAt,
      primaryMetric: (data.primaryMetric as any) || 'CONVERSION_RATE',
      secondaryMetrics: data.secondaryMetrics || [],
      minSampleSize: data.minSampleSize || 100,
      confidenceLevel: data.confidenceLevel || 0.95,
      status: 'DRAFT',
      variants: {
        create: normalizedVariants.map(v => ({
          name: v.name,
          isControl: v.isControl,
          changes: v.changes as any,
          weight: v.weight,
        })),
      },
    },
    include: {
      variants: true,
    },
  });

  logger.info(`A/B test created: ${test.id} - ${test.name}`);
  return test;
}

/**
 * テストを開始
 */
export async function startABTest(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test) {
    throw new Error('Test not found');
  }

  if (test.status !== 'DRAFT' && test.status !== 'SCHEDULED') {
    throw new Error(`Cannot start test in ${test.status} status`);
  }

  // テストを開始状態に更新
  const updatedTest = await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'RUNNING',
      startAt: new Date(),
    },
  });

  logger.info(`A/B test started: ${testId}`);
  return updatedTest;
}

/**
 * テストを停止
 */
export async function stopABTest(testId: string, reason?: string) {
  const test = await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'PAUSED',
      conclusion: reason || 'Manually paused',
    },
  });

  logger.info(`A/B test paused: ${testId}`);
  return test;
}

/**
 * テストを完了
 */
export async function completeABTest(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test) {
    throw new Error('Test not found');
  }

  // 統計的有意性を計算
  const significance = await calculateSignificance(testId);

  // 勝者バリアントを決定
  const winner = await determineWinner(testId);

  const updatedTest = await prisma.aBTest.update({
    where: { id: testId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      isSignificant: significance.isSignificant,
      winningVariantId: winner?.id,
      conclusion: generateConclusion(test, winner, significance),
    },
  });

  logger.info(`A/B test completed: ${testId}, winner: ${winner?.name || 'None'}`);
  return updatedTest;
}

/**
 * リスティング/商品をバリアントに割り当て
 */
export async function assignToVariant(
  testId: string,
  entityId: string,
  entityType: 'listing' | 'product'
): Promise<string | null> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test || test.status !== 'RUNNING') {
    return null;
  }

  // 既存の割り当てをチェック
  const existingAssignment = await prisma.aBTestAssignment.findFirst({
    where: {
      testId,
      ...(entityType === 'listing' ? { listingId: entityId } : { productId: entityId }),
    },
  });

  if (existingAssignment) {
    return existingAssignment.variantId;
  }

  // トラフィック配分チェック
  if (Math.random() * 100 > test.trafficPercent) {
    return null; // テスト対象外
  }

  // 重み付きランダムでバリアントを選択
  const variant = selectVariantByWeight(test.variants);
  if (!variant) {
    return null;
  }

  // 割り当てを作成
  await prisma.aBTestAssignment.create({
    data: {
      testId,
      variantId: variant.id,
      ...(entityType === 'listing' ? { listingId: entityId } : { productId: entityId }),
    },
  });

  return variant.id;
}

/**
 * イベントを記録（インプレッション、クリック、購入など）
 */
export async function recordEvent(
  testId: string,
  entityId: string,
  entityType: 'listing' | 'product',
  eventType: 'impression' | 'click' | 'view' | 'conversion',
  revenue?: number
) {
  const assignment = await prisma.aBTestAssignment.findFirst({
    where: {
      testId,
      ...(entityType === 'listing' ? { listingId: entityId } : { productId: entityId }),
    },
  });

  if (!assignment) {
    return null;
  }

  // 割り当てを更新
  const updateData: Record<string, unknown> = {
    lastEventAt: new Date(),
  };

  switch (eventType) {
    case 'impression':
      updateData.impressions = { increment: 1 };
      break;
    case 'click':
      updateData.clicks = { increment: 1 };
      break;
    case 'view':
      updateData.views = { increment: 1 };
      break;
    case 'conversion':
      updateData.conversions = { increment: 1 };
      if (revenue) {
        updateData.revenue = { increment: revenue };
      }
      break;
  }

  await prisma.aBTestAssignment.update({
    where: { id: assignment.id },
    data: updateData as any,
  });

  // バリアント統計も更新
  const variantUpdate: Record<string, unknown> = {};
  switch (eventType) {
    case 'impression':
      variantUpdate.impressions = { increment: 1 };
      break;
    case 'click':
      variantUpdate.clicks = { increment: 1 };
      break;
    case 'view':
      variantUpdate.views = { increment: 1 };
      break;
    case 'conversion':
      variantUpdate.sales = { increment: 1 };
      if (revenue) {
        variantUpdate.revenue = { increment: revenue };
      }
      break;
  }

  await prisma.aBTestVariant.update({
    where: { id: assignment.variantId },
    data: variantUpdate as any,
  });

  return assignment;
}

/**
 * テスト結果を取得
 */
export async function getTestResults(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      variants: true,
      assignments: true,
    },
  });

  if (!test) {
    throw new Error('Test not found');
  }

  // 各バリアントの統計を計算
  const variantStats = test.variants.map(variant => {
    const conversionRate = variant.views > 0
      ? (variant.sales / variant.views) * 100
      : 0;
    const clickRate = variant.impressions > 0
      ? (variant.clicks / variant.impressions) * 100
      : 0;
    const avgOrderValue = variant.sales > 0
      ? variant.revenue / variant.sales
      : 0;

    return {
      id: variant.id,
      name: variant.name,
      isControl: variant.isControl,
      weight: variant.weight,
      impressions: variant.impressions,
      clicks: variant.clicks,
      views: variant.views,
      sales: variant.sales,
      revenue: variant.revenue,
      conversionRate,
      clickRate,
      avgOrderValue,
    };
  });

  // コントロールグループを基準にした比較
  const control = variantStats.find(v => v.isControl);
  const comparisons = variantStats
    .filter(v => !v.isControl)
    .map(variant => {
      const lift = control && control.conversionRate > 0
        ? ((variant.conversionRate - control.conversionRate) / control.conversionRate) * 100
        : 0;

      return {
        variantId: variant.id,
        variantName: variant.name,
        controlConversionRate: control?.conversionRate || 0,
        variantConversionRate: variant.conversionRate,
        lift,
        liftFormatted: `${lift > 0 ? '+' : ''}${lift.toFixed(2)}%`,
      };
    });

  // サンプルサイズチェック
  const totalSamples = variantStats.reduce((sum, v) => sum + v.views, 0);
  const hasMinSamples = totalSamples >= test.minSampleSize;

  return {
    test: {
      id: test.id,
      name: test.name,
      status: test.status,
      startAt: test.startAt,
      endAt: test.endAt,
      primaryMetric: test.primaryMetric,
      minSampleSize: test.minSampleSize,
      confidenceLevel: test.confidenceLevel,
    },
    variants: variantStats,
    comparisons,
    summary: {
      totalSamples,
      hasMinSamples,
      isSignificant: test.isSignificant,
      winningVariantId: test.winningVariantId,
      conclusion: test.conclusion,
    },
  };
}

/**
 * 統計的有意性を計算（二項検定 / Z検定）
 */
async function calculateSignificance(testId: string): Promise<SignificanceResult> {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test || test.variants.length < 2) {
    return {
      isSignificant: false,
      pValue: 1,
      confidenceInterval: { lower: 0, upper: 0 },
      lift: 0,
      liftConfidenceInterval: { lower: 0, upper: 0 },
    };
  }

  const control = test.variants.find(v => v.isControl);
  const treatment = test.variants.find(v => !v.isControl);

  if (!control || !treatment) {
    return {
      isSignificant: false,
      pValue: 1,
      confidenceInterval: { lower: 0, upper: 0 },
      lift: 0,
      liftConfidenceInterval: { lower: 0, upper: 0 },
    };
  }

  // コンバージョン率を計算
  const controlRate = control.views > 0 ? control.sales / control.views : 0;
  const treatmentRate = treatment.views > 0 ? treatment.sales / treatment.views : 0;

  // プール標準誤差
  const pooledRate = (control.sales + treatment.sales) / (control.views + treatment.views);
  const standardError = Math.sqrt(
    pooledRate * (1 - pooledRate) * (1 / control.views + 1 / treatment.views)
  );

  // Z値
  const zValue = standardError > 0 ? (treatmentRate - controlRate) / standardError : 0;

  // P値（両側検定）
  const pValue = 2 * (1 - normalCDF(Math.abs(zValue)));

  // 信頼区間
  const zCritical = getZCritical(test.confidenceLevel);
  const diff = treatmentRate - controlRate;
  const marginOfError = zCritical * standardError;

  // リフト（改善率）
  const lift = controlRate > 0 ? (treatmentRate - controlRate) / controlRate : 0;

  return {
    isSignificant: pValue < (1 - test.confidenceLevel),
    pValue,
    confidenceInterval: {
      lower: diff - marginOfError,
      upper: diff + marginOfError,
    },
    lift: lift * 100,
    liftConfidenceInterval: {
      lower: controlRate > 0 ? ((diff - marginOfError) / controlRate) * 100 : 0,
      upper: controlRate > 0 ? ((diff + marginOfError) / controlRate) * 100 : 0,
    },
  };
}

/**
 * 勝者バリアントを決定
 */
async function determineWinner(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test) return null;

  // 指標に基づいて勝者を決定
  let winner = null;
  let bestValue = -Infinity;

  for (const variant of test.variants) {
    let value = 0;
    switch (test.primaryMetric) {
      case 'CONVERSION_RATE':
        value = variant.views > 0 ? variant.sales / variant.views : 0;
        break;
      case 'CLICK_RATE':
        value = variant.impressions > 0 ? variant.clicks / variant.impressions : 0;
        break;
      case 'REVENUE':
        value = variant.revenue;
        break;
      case 'AVG_ORDER_VALUE':
        value = variant.sales > 0 ? variant.revenue / variant.sales : 0;
        break;
      default:
        value = variant.sales;
    }

    if (value > bestValue) {
      bestValue = value;
      winner = variant;
    }
  }

  return winner;
}

/**
 * 結論テキストを生成
 */
function generateConclusion(
  test: { name: string; primaryMetric: string },
  winner: { name: string; isControl: boolean } | null,
  significance: SignificanceResult
): string {
  if (!winner) {
    return 'テスト結果: 勝者を決定できませんでした。';
  }

  const metricName = {
    CONVERSION_RATE: 'コンバージョン率',
    CLICK_RATE: 'クリック率',
    REVENUE: '収益',
    AVG_ORDER_VALUE: '平均注文額',
  }[test.primaryMetric] || test.primaryMetric;

  if (!significance.isSignificant) {
    return `テスト「${test.name}」の結果: ${metricName}において統計的に有意な差は見られませんでした（p値: ${significance.pValue.toFixed(4)}）。`;
  }

  if (winner.isControl) {
    return `テスト「${test.name}」の結果: コントロールグループが勝者です。変更による改善は見られませんでした（リフト: ${significance.lift.toFixed(2)}%）。`;
  }

  return `テスト「${test.name}」の結果: 「${winner.name}」が勝者です。${metricName}が${significance.lift.toFixed(2)}%改善しました（p値: ${significance.pValue.toFixed(4)}）。`;
}

/**
 * 重み付きランダムでバリアントを選択
 */
function selectVariantByWeight(variants: Array<{ id: string; weight: number }>) {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) {
      return variant;
    }
  }

  return variants[0];
}

/**
 * 標準正規分布の累積分布関数
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * 信頼水準からZ臨界値を取得
 */
function getZCritical(confidenceLevel: number): number {
  // 一般的な信頼水準のZ値
  const zValues: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };

  return zValues[confidenceLevel] || 1.96;
}

/**
 * A/Bテスト統計を取得
 */
export async function getABTestStats() {
  const [total, running, completed, totalAssignments] = await Promise.all([
    prisma.aBTest.count(),
    prisma.aBTest.count({ where: { status: 'RUNNING' } }),
    prisma.aBTest.count({ where: { status: 'COMPLETED' } }),
    prisma.aBTestAssignment.count(),
  ]);

  // 最近のテスト
  const recentTests = await prisma.aBTest.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      variants: {
        select: {
          id: true,
          name: true,
          isControl: true,
        },
      },
    },
  });

  // 有意な結果が出たテスト数
  const significantCount = await prisma.aBTest.count({
    where: {
      status: 'COMPLETED',
      isSignificant: true,
    },
  });

  return {
    total,
    running,
    completed,
    totalAssignments,
    significantCount,
    significantRate: completed > 0 ? (significantCount / completed) * 100 : 0,
    recentTests,
  };
}
