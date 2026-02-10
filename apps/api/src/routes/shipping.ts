import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'shipping-api' });

// 配送業者
type ShippingCarrier = 'JAPAN_POST' | 'DHL' | 'FEDEX' | 'UPS' | 'EMS';

// 配送料金表
const SHIPPING_RATES: Record<ShippingCarrier, { baseRate: number; perGram: number }> = {
  JAPAN_POST: { baseRate: 900, perGram: 0.5 },
  EMS: { baseRate: 2000, perGram: 1.0 },
  DHL: { baseRate: 3000, perGram: 1.5 },
  FEDEX: { baseRate: 3500, perGram: 1.5 },
  UPS: { baseRate: 3200, perGram: 1.4 },
};

/**
 * @swagger
 * /api/shipping/labels:
 *   post:
 *     summary: 配送ラベルを生成
 *     tags: [Shipping]
 */
router.post('/labels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, carrier, weight, dimensions, format } = req.body;

    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return;
    }

    // 注文を取得
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { sales: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // 重量を推定（500g/アイテム）
    const estimatedWeight = weight || order.sales.length * 500;

    // 配送業者を決定
    const selectedCarrier: ShippingCarrier = carrier || 'JAPAN_POST';

    // 配送料金を計算
    const rates = SHIPPING_RATES[selectedCarrier];
    const shippingCost = Math.round(rates.baseRate + estimatedWeight * rates.perGram);

    // トラッキング番号を生成
    const trackingNumber = `${selectedCarrier.substring(0, 2)}${Date.now().toString(36).toUpperCase()}`;

    // ラベルURL（シミュレーション）
    const labelUrl = `https://storage.rakuda.example.com/labels/${trackingNumber}.pdf`;

    // 記録
    const labelRecord = await prisma.shadowLog.create({
      data: {
        service: 'shipping-label',
        operation: 'generate',
        input: { orderId, carrier: selectedCarrier, weight: estimatedWeight, dimensions },
        output: { trackingNumber, labelUrl, shippingCost, format: format || 'PDF' },
        decision: 'LABEL_GENERATED',
        decisionReason: `Shipping label generated for ${selectedCarrier}`,
        isDryRun: false,
      },
    });

    // 注文を更新
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
      },
    });

    log.info({ type: 'label_generated', orderId, carrier: selectedCarrier, trackingNumber });

    res.json({
      id: labelRecord.id,
      orderId,
      carrier: selectedCarrier,
      trackingNumber,
      labelUrl,
      format: format || 'PDF',
      weight: estimatedWeight,
      shippingCost,
      createdAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shipping/labels/bulk:
 *   post:
 *     summary: 一括配送ラベル生成
 *     tags: [Shipping]
 */
router.post('/labels/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderIds, carrier } = req.body as { orderIds: string[]; carrier?: ShippingCarrier };

    if (!orderIds || orderIds.length === 0) {
      res.status(400).json({ error: 'orderIds is required' });
      return;
    }

    const results = {
      generated: 0,
      failed: 0,
      labels: [] as any[],
      errors: [] as Array<{ orderId: string; error: string }>,
    };

    for (const orderId of orderIds) {
      try {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
          results.errors.push({ orderId, error: 'Order not found' });
          results.failed++;
          continue;
        }

        const selectedCarrier = carrier || 'JAPAN_POST';
        const trackingNumber = `${selectedCarrier.substring(0, 2)}${Date.now().toString(36).toUpperCase()}`;

        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'SHIPPED', shippedAt: new Date() },
        });

        results.labels.push({
          orderId,
          carrier: selectedCarrier,
          trackingNumber,
          labelUrl: `https://storage.rakuda.example.com/labels/${trackingNumber}.pdf`,
        });
        results.generated++;
      } catch (error: any) {
        results.errors.push({ orderId, error: error.message });
        results.failed++;
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shipping/rates:
 *   post:
 *     summary: 配送料金を見積もり
 *     tags: [Shipping]
 */
router.post('/rates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { weight, country } = req.body;

    if (!weight || !country) {
      res.status(400).json({ error: 'weight and country are required' });
      return;
    }

    const rates: Array<{ carrier: ShippingCarrier; cost: number; estimatedDays: string }> = [];

    for (const [carrier, rate] of Object.entries(SHIPPING_RATES)) {
      let cost = rate.baseRate + weight * rate.perGram;

      // 地域別追加料金
      const americas = ['US', 'CA', 'MX', 'BR'];
      const europe = ['GB', 'DE', 'FR', 'IT', 'ES'];
      if (americas.includes(country.toUpperCase())) cost *= 1.2;
      if (europe.includes(country.toUpperCase())) cost *= 1.1;

      const estimatedDays = {
        JAPAN_POST: '7-14 days',
        EMS: '3-7 days',
        DHL: '2-5 days',
        FEDEX: '2-4 days',
        UPS: '2-5 days',
      }[carrier as ShippingCarrier];

      rates.push({
        carrier: carrier as ShippingCarrier,
        cost: Math.round(cost),
        estimatedDays: estimatedDays || '7-14 days',
      });
    }

    // 料金順にソート
    rates.sort((a, b) => a.cost - b.cost);

    res.json({
      weight,
      country,
      rates,
      recommended: rates[0]?.carrier,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/shipping/tracking/{trackingNumber}:
 *   get:
 *     summary: 配送状況を取得
 *     tags: [Shipping]
 */
router.get('/tracking/:trackingNumber', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trackingNumber } = req.params;

    // シミュレーション（実際のAPIでは配送業者に問い合わせ）
    const status = {
      trackingNumber,
      status: 'IN_TRANSIT',
      lastUpdate: new Date(),
      location: 'Tokyo, Japan',
      events: [
        { timestamp: new Date(Date.now() - 86400000), event: 'Shipped', location: 'Tokyo, Japan' },
        { timestamp: new Date(), event: 'In transit', location: 'Narita Airport' },
      ],
    };

    res.json(status);
  } catch (error) {
    next(error);
  }
});

export { router as shippingRouter };
