
import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { z } from 'zod';

const router = Router();

// ========================================
// 通貨統計
// ========================================
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalCurrencies,
      enabledCurrencies,
      baseCurrency,
      recentConversions,
      rateUpdatesLast24h,
    ] = await Promise.all([
      prisma.currency.count(),
      prisma.currency.count({ where: { isEnabled: true } }),
      prisma.currency.findFirst({ where: { isBaseCurrency: true } }),
      prisma.priceConversion.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.exchangeRate.count({
        where: { fetchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    res.json({
      totalCurrencies,
      enabledCurrencies,
      baseCurrency: baseCurrency?.code || 'JPY',
      recentConversions,
      rateUpdatesLast24h,
    });
  } catch (error) {
    console.error('Failed to get currency stats:', error);
    res.status(500).json({ error: 'Failed to get currency stats' });
  }
});

// ========================================
// 通貨一覧
// ========================================
router.get('/currencies', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.query;

    const where: any = {};
    if (enabled === 'true') where.isEnabled = true;

    const currencies = await prisma.currency.findMany({
      where,
      orderBy: [{ isBaseCurrency: 'desc' }, { sortOrder: 'asc' }],
    });

    res.json(currencies);
  } catch (error) {
    console.error('Failed to get currencies:', error);
    res.status(500).json({ error: 'Failed to get currencies' });
  }
});

// ========================================
// 通貨作成
// ========================================
const createCurrencySchema = z.object({
  code: z.string().length(3).toUpperCase(),
  name: z.string().min(1),
  nameJa: z.string().optional(),
  symbol: z.string().min(1),
  decimals: z.number().min(0).max(4).optional(),
  isBaseCurrency: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().optional(),
  currentRate: z.number().positive().optional(),
});

router.post('/currencies', async (req: Request, res: Response) => {
  try {
    const data = createCurrencySchema.parse(req.body);

    // 基準通貨を設定する場合、既存の基準通貨をリセット
    if (data.isBaseCurrency) {
      await prisma.currency.updateMany({
        where: { isBaseCurrency: true },
        data: { isBaseCurrency: false },
      });
    }

    const currency = await prisma.currency.create({
      data: {
        code: data.code,
        name: data.name,
        nameJa: data.nameJa,
        symbol: data.symbol,
        decimals: data.decimals ?? 2,
        isBaseCurrency: data.isBaseCurrency ?? false,
        isEnabled: data.isEnabled ?? true,
        sortOrder: data.sortOrder ?? 100,
        currentRate: data.currentRate ?? 1,
      },
    });

    res.status(201).json(currency);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Failed to create currency:', error);
    res.status(500).json({ error: 'Failed to create currency' });
  }
});

// ========================================
// 通貨更新
// ========================================
router.patch('/currencies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.isBaseCurrency === true) {
      await prisma.currency.updateMany({
        where: { isBaseCurrency: true, id: { not: id } },
        data: { isBaseCurrency: false },
      });
    }

    const currency = await prisma.currency.update({
      where: { id },
      data,
    });

    res.json(currency);
  } catch (error) {
    console.error('Failed to update currency:', error);
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

// ========================================
// 為替レート取得
// ========================================
router.get('/rates', async (req: Request, res: Response) => {
  try {
    const { from, to, limit = '100' } = req.query;

    const where: any = {};
    if (from) where.fromCurrency = from as string;
    if (to) where.toCurrency = to as string;

    const rates = await prisma.exchangeRate.findMany({
      where,
      orderBy: { fetchedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(rates);
  } catch (error) {
    console.error('Failed to get exchange rates:', error);
    res.status(500).json({ error: 'Failed to get exchange rates' });
  }
});

// ========================================
// 最新レート取得
// ========================================
router.get('/rates/latest', async (req: Request, res: Response) => {
  try {
    const { base = 'JPY' } = req.query;

    const baseCurrency = await prisma.currency.findUnique({
      where: { code: base as string },
    });

    if (!baseCurrency) {
      return res.status(404).json({ error: 'Base currency not found' });
    }

    // ExchangeRate uses string fields fromCurrency/toCurrency (not relation IDs)
    const rates = await prisma.exchangeRate.findMany({
      where: {
        fromCurrency: base as string,
      },
      orderBy: { fetchedAt: 'desc' },
      distinct: ['toCurrency'],
    });

    res.json({
      base: base,
      timestamp: new Date().toISOString(),
      rates: rates.map((r) => ({
        currency: r.toCurrency,
        rate: r.rate,
        fetchedAt: r.fetchedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to get latest rates:', error);
    res.status(500).json({ error: 'Failed to get latest rates' });
  }
});

// ========================================
// 為替レート更新
// ========================================
const updateRateSchema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
  source: z.string().optional(),
});

router.post('/rates', async (req: Request, res: Response) => {
  try {
    const data = updateRateSchema.parse(req.body);

    const [fromCurrencyRecord, toCurrencyRecord] = await Promise.all([
      prisma.currency.findUnique({ where: { code: data.fromCurrency } }),
      prisma.currency.findUnique({ where: { code: data.toCurrency } }),
    ]);

    if (!fromCurrencyRecord || !toCurrencyRecord) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    const rate = await prisma.exchangeRate.create({
      data: {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        source: data.source || 'manual',
      },
    });

    // 通貨の現在レートも更新
    await prisma.currency.update({
      where: { id: toCurrencyRecord.id },
      data: {
        currentRate: data.rate,
        lastRateUpdate: new Date(),
      },
    });

    res.status(201).json(rate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Failed to update rate:', error);
    res.status(500).json({ error: 'Failed to update rate' });
  }
});

// ========================================
// 価格変換
// ========================================
const convertSchema = z.object({
  amount: z.number(),
  from: z.string().length(3),
  to: z.string().length(3),
  entityType: z.enum(['PRODUCT', 'LISTING', 'ORDER', 'SHIPMENT', 'INVOICE', 'REFUND']).optional(),
  entityId: z.string().optional(),
});

router.post('/convert', async (req: Request, res: Response) => {
  try {
    const data = convertSchema.parse(req.body);

    const [fromCurrencyRecord, toCurrencyRecord] = await Promise.all([
      prisma.currency.findUnique({ where: { code: data.from } }),
      prisma.currency.findUnique({ where: { code: data.to } }),
    ]);

    if (!fromCurrencyRecord || !toCurrencyRecord) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    // 最新のレートを取得
    let rateRecord = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: data.from,
        toCurrency: data.to,
      },
      orderBy: { fetchedAt: 'desc' },
    });

    // 直接のレートがない場合、逆レートを探す
    if (!rateRecord) {
      const inverseRateRecord = await prisma.exchangeRate.findFirst({
        where: {
          fromCurrency: data.to,
          toCurrency: data.from,
        },
        orderBy: { fetchedAt: 'desc' },
      });

      if (inverseRateRecord) {
        // Create a virtual rate record using inverse
        rateRecord = {
          ...inverseRateRecord,
          rate: 1 / inverseRateRecord.rate,
        };
      }
    }

    if (!rateRecord) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    const convertedAmount = data.amount * rateRecord.rate;

    // 変換履歴を保存
    if (data.entityType && data.entityId) {
      await prisma.priceConversion.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          originalCurrencyId: fromCurrencyRecord.id,
          originalAmount: data.amount,
          convertedCurrency: toCurrencyRecord.code,
          convertedAmount,
          exchangeRate: rateRecord.rate,
          rateTimestamp: rateRecord.fetchedAt,
        },
      });
    }

    res.json({
      from: {
        currency: data.from,
        amount: data.amount,
        symbol: fromCurrencyRecord.symbol,
      },
      to: {
        currency: data.to,
        amount: Math.round(convertedAmount * Math.pow(10, toCurrencyRecord.decimals)) / Math.pow(10, toCurrencyRecord.decimals),
        symbol: toCurrencyRecord.symbol,
      },
      rate: rateRecord.rate,
      timestamp: rateRecord.fetchedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Failed to convert:', error);
    res.status(500).json({ error: 'Failed to convert' });
  }
});

// ========================================
// 変換履歴
// ========================================
router.get('/conversions', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, limit = '50' } = req.query;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const conversions = await prisma.priceConversion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        originalCurrency: { select: { code: true, symbol: true } },
      },
    });

    res.json(conversions);
  } catch (error) {
    console.error('Failed to get conversions:', error);
    res.status(500).json({ error: 'Failed to get conversions' });
  }
});

// ========================================
// 通貨設定
// ========================================
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const { scope = 'GLOBAL', scopeId } = req.query;

    const setting = await prisma.currencySetting.findUnique({
      where: {
        scope_scopeId: {
          scope: scope as any,
          scopeId: (scopeId as string) || '',
        },
      },
      include: {
        baseCurrency: true,
      },
    });

    if (!setting) {
      // デフォルト設定を返す
      const defaultBase = await prisma.currency.findFirst({
        where: { isBaseCurrency: true },
      });

      return res.json({
        scope,
        scopeId: null,
        baseCurrency: defaultBase,
        displayCurrencies: ['USD', 'EUR', 'GBP'],
        autoConvert: true,
        showOriginal: true,
        roundingMode: 'HALF_UP',
        roundingScale: 2,
      });
    }

    res.json(setting);
  } catch (error) {
    console.error('Failed to get currency settings:', error);
    res.status(500).json({ error: 'Failed to get currency settings' });
  }
});

// ========================================
// 通貨設定更新
// ========================================
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const {
      scope = 'GLOBAL',
      scopeId,
      baseCurrencyCode,
      displayCurrencies,
      autoConvert,
      showOriginal,
      roundingMode,
      roundingScale,
    } = req.body;

    const baseCurrency = await prisma.currency.findUnique({
      where: { code: baseCurrencyCode },
    });

    if (!baseCurrency) {
      return res.status(404).json({ error: 'Base currency not found' });
    }

    const setting = await prisma.currencySetting.upsert({
      where: {
        scope_scopeId: {
          scope,
          scopeId: scopeId || '',
        },
      },
      update: {
        baseCurrencyId: baseCurrency.id,
        displayCurrencies,
        autoConvert,
        showOriginal,
        roundingMode,
        roundingScale,
      },
      create: {
        scope,
        scopeId: scopeId || '',
        baseCurrencyId: baseCurrency.id,
        displayCurrencies: displayCurrencies || [],
        autoConvert: autoConvert ?? true,
        showOriginal: showOriginal ?? true,
        roundingMode: roundingMode || 'HALF_UP',
        roundingScale: roundingScale ?? 2,
      },
      include: {
        baseCurrency: true,
      },
    });

    res.json(setting);
  } catch (error) {
    console.error('Failed to update currency settings:', error);
    res.status(500).json({ error: 'Failed to update currency settings' });
  }
});

// ========================================
// デフォルト通貨をセットアップ
// ========================================
router.post('/setup-defaults', async (_req: Request, res: Response) => {
  try {
    const defaultCurrencies = [
      { code: 'JPY', name: 'Japanese Yen', nameJa: '日本円', symbol: '¥', decimals: 0, isBaseCurrency: true, sortOrder: 1 },
      { code: 'USD', name: 'US Dollar', nameJa: '米ドル', symbol: '$', decimals: 2, sortOrder: 2 },
      { code: 'EUR', name: 'Euro', nameJa: 'ユーロ', symbol: '€', decimals: 2, sortOrder: 3 },
      { code: 'GBP', name: 'British Pound', nameJa: '英ポンド', symbol: '£', decimals: 2, sortOrder: 4 },
      { code: 'CNY', name: 'Chinese Yuan', nameJa: '中国元', symbol: '¥', decimals: 2, sortOrder: 5 },
      { code: 'KRW', name: 'Korean Won', nameJa: '韓国ウォン', symbol: '₩', decimals: 0, sortOrder: 6 },
      { code: 'AUD', name: 'Australian Dollar', nameJa: '豪ドル', symbol: 'A$', decimals: 2, sortOrder: 7 },
      { code: 'CAD', name: 'Canadian Dollar', nameJa: 'カナダドル', symbol: 'C$', decimals: 2, sortOrder: 8 },
    ];

    let created = 0;
    for (const currency of defaultCurrencies) {
      const existing = await prisma.currency.findUnique({
        where: { code: currency.code },
      });

      if (!existing) {
        await prisma.currency.create({ data: currency });
        created++;
      }
    }

    res.json({ success: true, created, message: `${created} currencies created` });
  } catch (error) {
    console.error('Failed to setup default currencies:', error);
    res.status(500).json({ error: 'Failed to setup default currencies' });
  }
});

export { router as multiCurrencyRouter };
