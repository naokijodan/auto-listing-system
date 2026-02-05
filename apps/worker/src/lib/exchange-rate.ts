import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { EXCHANGE_RATE_DEFAULTS } from '@rakuda/config';

const log = logger.child({ module: 'exchange-rate' });

/**
 * 為替レート取得結果
 */
export interface ExchangeRateResult {
  success: boolean;
  rate?: number;
  source?: string;
  error?: string;
}

/**
 * 外部APIから為替レートを取得
 */
async function fetchExchangeRateFromAPI(): Promise<ExchangeRateResult> {
  // ExchangeRate-API (無料プラン)
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    log.warn({ type: 'exchange_rate_api_not_configured' });
    return { success: false, error: 'Exchange rate API not configured' };
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/JPY/USD`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result === 'success') {
      return {
        success: true,
        rate: data.conversion_rate,
        source: 'exchangerate-api',
      };
    } else {
      throw new Error(data['error-type'] || 'Unknown API error');
    }
  } catch (error: any) {
    log.error({ type: 'exchange_rate_api_error', error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * フォールバック: Yahoo Finance API
 */
async function fetchExchangeRateYahoo(): Promise<ExchangeRateResult> {
  try {
    // Yahoo Finance APIは商用利用に制限があるため、シンプルなフォールバック
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/JPYUSD=X?interval=1d&range=1d'
    );

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const quote = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (quote) {
      return {
        success: true,
        rate: quote,
        source: 'yahoo-finance',
      };
    } else {
      throw new Error('Could not extract rate from Yahoo response');
    }
  } catch (error: any) {
    log.error({ type: 'exchange_rate_yahoo_error', error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 為替レートを更新
 */
export async function updateExchangeRate(): Promise<{
  success: boolean;
  oldRate: number;
  newRate: number;
  source: string;
  error?: string;
}> {
  log.info({ type: 'exchange_rate_update_start' });

  // 現在のレートを取得
  const currentRate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: 'JPY',
      toCurrency: 'USD',
    },
    orderBy: {
      fetchedAt: 'desc',
    },
  });

  const oldRate = currentRate?.rate || EXCHANGE_RATE_DEFAULTS.JPY_TO_USD;

  // 外部APIからレート取得
  let result = await fetchExchangeRateFromAPI();

  // フォールバック
  if (!result.success) {
    result = await fetchExchangeRateYahoo();
  }

  if (!result.success) {
    log.error({ type: 'exchange_rate_update_failed', error: result.error });
    return {
      success: false,
      oldRate,
      newRate: oldRate,
      source: 'none',
      error: result.error,
    };
  }

  const newRate = result.rate!;

  // DB に新しいレートを保存
  await prisma.exchangeRate.create({
    data: {
      fromCurrency: 'JPY',
      toCurrency: 'USD',
      rate: newRate,
      source: result.source || 'unknown',
    },
  });

  // 価格設定の為替レートも更新
  await prisma.priceSetting.updateMany({
    data: {
      exchangeRate: 1 / newRate, // USD/JPY に変換
      updatedAt: new Date(),
    },
  });

  log.info({
    type: 'exchange_rate_updated',
    oldRate,
    newRate,
    source: result.source,
    jpyPerUsd: (1 / newRate).toFixed(2),
  });

  return {
    success: true,
    oldRate,
    newRate,
    source: result.source!,
  };
}

/**
 * 最新の為替レートを取得
 */
export async function getLatestExchangeRate(): Promise<{
  jpyToUsd: number;
  usdToJpy: number;
  fetchedAt: Date;
  source: string;
}> {
  const rate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrency: 'JPY',
      toCurrency: 'USD',
    },
    orderBy: {
      fetchedAt: 'desc',
    },
  });

  if (!rate) {
    // デフォルト値（定数を使用）
    return {
      jpyToUsd: EXCHANGE_RATE_DEFAULTS.JPY_TO_USD,
      usdToJpy: 1 / EXCHANGE_RATE_DEFAULTS.JPY_TO_USD,
      fetchedAt: new Date(),
      source: 'default',
    };
  }

  return {
    jpyToUsd: rate.rate,
    usdToJpy: 1 / rate.rate,
    fetchedAt: rate.fetchedAt,
    source: rate.source,
  };
}
