import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'webhooks' });

// Webhook設定
const EBAY_VERIFICATION_TOKEN = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN || '';
const JOOM_WEBHOOK_SECRET = process.env.JOOM_WEBHOOK_SECRET || '';

/**
 * eBay Webhook署名検証
 */
function verifyEbaySignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  if (!EBAY_VERIFICATION_TOKEN) {
    log.warn('EBAY_WEBHOOK_VERIFICATION_TOKEN not configured');
    return false;
  }

  try {
    // eBay uses HMAC-SHA256 with verification token
    const message = `${timestamp}${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', EBAY_VERIFICATION_TOKEN)
      .update(message)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    log.error('eBay signature verification failed', error);
    return false;
  }
}

/**
 * Joom Webhook署名検証
 */
function verifyJoomSignature(payload: string, signature: string): boolean {
  if (!JOOM_WEBHOOK_SECRET) {
    log.warn('JOOM_WEBHOOK_SECRET not configured');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', JOOM_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    log.error('Joom signature verification failed', error);
    return false;
  }
}

/**
 * eBay Webhook Challenge応答
 * eBayはWebhook登録時にチャレンジリクエストを送信する
 */
router.get('/ebay', async (req, res) => {
  const challengeCode = req.query.challenge_code as string;

  if (!challengeCode) {
    res.status(400).json({ error: 'Missing challenge_code' });
    return;
  }

  if (!EBAY_VERIFICATION_TOKEN) {
    log.error('EBAY_WEBHOOK_VERIFICATION_TOKEN not configured for challenge');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  // Generate challenge response
  const hash = crypto
    .createHash('sha256')
    .update(challengeCode)
    .update(EBAY_VERIFICATION_TOKEN)
    .update(process.env.EBAY_WEBHOOK_ENDPOINT || '')
    .digest('hex');

  log.info('eBay webhook challenge received and responded');

  res.json({ challengeResponse: hash });
});

/**
 * eBay Webhook受信
 */
router.post('/ebay', async (req, res, next) => {
  try {
    const signature = req.headers['x-ebay-signature'] as string;
    const timestamp = req.headers['x-ebay-timestamp'] as string;
    const payload = JSON.stringify(req.body);

    // 署名検証（開発環境ではスキップ可能）
    if (process.env.NODE_ENV === 'production') {
      if (!signature || !timestamp) {
        log.warn('eBay webhook missing signature or timestamp');
        res.status(401).json({ error: 'Missing signature' });
        return;
      }

      if (!verifyEbaySignature(payload, signature, timestamp)) {
        log.warn('eBay webhook signature verification failed');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const { metadata, notification } = req.body;
    const eventType = metadata?.topic || 'UNKNOWN';

    log.info({ eventType, notificationId: metadata?.notificationId }, 'eBay webhook received');

    // Webhookイベントを保存
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: 'EBAY',
        eventType,
        payload: req.body,
        headers: {
          signature,
          timestamp,
          notificationId: metadata?.notificationId,
        },
        signature,
        status: 'PENDING',
      },
    });

    // イベントタイプ別処理
    try {
      await processEbayEvent(webhookEvent.id, eventType, notification);

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      log.error({ webhookEventId: webhookEvent.id, error }, 'eBay event processing failed');

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }

    // eBayは200を返さないとリトライする
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Joom Webhook受信
 */
router.post('/joom', async (req, res, next) => {
  try {
    const signature = req.headers['x-joom-signature'] as string;
    const payload = JSON.stringify(req.body);

    // 署名検証（開発環境ではスキップ可能）
    if (process.env.NODE_ENV === 'production') {
      if (!signature) {
        log.warn('Joom webhook missing signature');
        res.status(401).json({ error: 'Missing signature' });
        return;
      }

      if (!verifyJoomSignature(payload, signature)) {
        log.warn('Joom webhook signature verification failed');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const eventType = req.body.event || req.body.type || 'UNKNOWN';

    log.info({ eventType }, 'Joom webhook received');

    // Webhookイベントを保存
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: 'JOOM',
        eventType,
        payload: req.body,
        headers: { signature },
        signature,
        status: 'PENDING',
      },
    });

    // イベントタイプ別処理
    try {
      await processJoomEvent(webhookEvent.id, eventType, req.body);

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      log.error({ webhookEventId: webhookEvent.id, error }, 'Joom event processing failed');

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

/**
 * eBayイベント処理
 */
async function processEbayEvent(
  webhookEventId: string,
  eventType: string,
  notification: any
): Promise<void> {
  switch (eventType) {
    case 'MARKETPLACE_ORDER_CREATED':
    case 'MARKETPLACE_ORDER_STATUS_UPDATE':
      await processEbayOrder(webhookEventId, notification);
      break;

    case 'MARKETPLACE_ORDER_PAYMENT_COMPLETE':
      await processEbayPayment(webhookEventId, notification);
      break;

    case 'MARKETPLACE_ORDER_CANCELLED':
      await processEbayCancellation(webhookEventId, notification);
      break;

    case 'ITEM_OUT_OF_STOCK':
      await processEbayOutOfStock(webhookEventId, notification);
      break;

    // Phase 15: 配送状況更新
    case 'SHIPMENT_TRACKING_CREATED':
    case 'SHIPMENT_TRACKING_UPDATED':
      await processEbayShipmentTracking(webhookEventId, notification);
      break;

    // Phase 15: 返金通知
    case 'MARKETPLACE_REFUND_INITIATED':
    case 'MARKETPLACE_REFUND_COMPLETED':
      await processEbayRefund(webhookEventId, notification);
      break;

    default:
      log.info({ eventType }, 'Unhandled eBay event type');
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'IGNORED' },
      });
  }
}

/**
 * eBay注文処理
 */
async function processEbayOrder(
  webhookEventId: string,
  notification: any
): Promise<void> {
  const orderData = notification?.data;
  if (!orderData?.orderId) {
    throw new Error('Missing order data');
  }

  const existingOrder = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'EBAY',
        marketplaceOrderId: orderData.orderId,
      },
    },
  });

  if (existingOrder) {
    // 既存の注文を更新
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: mapEbayOrderStatus(orderData.orderFulfillmentStatus),
        paymentStatus: mapEbayPaymentStatus(orderData.orderPaymentStatus),
        rawData: orderData,
      },
    });
    log.info({ orderId: existingOrder.id }, 'eBay order updated');
  } else {
    // 新規注文を作成
    const lineItems = orderData.lineItems || [];
    const buyer = orderData.buyer || {};
    const fulfillmentStartInstructions = orderData.fulfillmentStartInstructions?.[0] || {};
    const shippingAddress = fulfillmentStartInstructions.shippingStep?.shipTo || {};

    const order = await prisma.order.create({
      data: {
        marketplace: 'EBAY',
        marketplaceOrderId: orderData.orderId,
        buyerUsername: buyer.username || 'unknown',
        buyerEmail: buyer.buyerRegistrationAddress?.email,
        buyerName: buyer.buyerRegistrationAddress?.fullName,
        shippingAddress: {
          addressLine1: shippingAddress.contactAddress?.addressLine1,
          addressLine2: shippingAddress.contactAddress?.addressLine2,
          city: shippingAddress.contactAddress?.city,
          stateOrProvince: shippingAddress.contactAddress?.stateOrProvince,
          postalCode: shippingAddress.contactAddress?.postalCode,
          country: shippingAddress.contactAddress?.countryCode,
        },
        subtotal: parseFloat(orderData.pricingSummary?.priceSubtotal?.value || '0'),
        shippingCost: parseFloat(orderData.pricingSummary?.deliveryCost?.value || '0'),
        tax: parseFloat(orderData.pricingSummary?.tax?.value || '0'),
        total: parseFloat(orderData.pricingSummary?.total?.value || '0'),
        currency: orderData.pricingSummary?.total?.currency || 'USD',
        status: mapEbayOrderStatus(orderData.orderFulfillmentStatus),
        paymentStatus: mapEbayPaymentStatus(orderData.orderPaymentStatus),
        orderedAt: new Date(orderData.creationDate || Date.now()),
        rawData: orderData,
      },
    });

    // 売上明細を作成
    for (const item of lineItems) {
      const listing = await prisma.listing.findFirst({
        where: {
          marketplace: 'EBAY',
          marketplaceListingId: item.legacyItemId,
        },
        include: { product: true },
      });

      await prisma.sale.create({
        data: {
          orderId: order.id,
          listingId: listing?.id,
          productId: listing?.productId,
          sku: item.sku || item.legacyItemId || 'unknown',
          title: item.title || 'Unknown Item',
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.lineItemCost?.value || '0'),
          totalPrice: parseFloat(item.total?.value || '0'),
          costPrice: listing?.product?.price,
          marketplaceItemId: item.legacyItemId,
        },
      });
    }

    // 通知を作成
    await prisma.notification.create({
      data: {
        type: 'ORDER_RECEIVED',
        title: '新規注文受付',
        message: `eBayで新しい注文を受け付けました（注文ID: ${orderData.orderId}）`,
        severity: 'SUCCESS',
        metadata: {
          orderId: order.id,
          marketplace: 'EBAY',
          total: order.total,
        },
      },
    });

    // Webhookイベントに注文IDを紐付け
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { orderId: order.id },
    });

    log.info({ orderId: order.id, marketplaceOrderId: orderData.orderId }, 'eBay order created');
  }
}

/**
 * eBay支払い完了処理
 */
async function processEbayPayment(
  webhookEventId: string,
  notification: any
): Promise<void> {
  const orderData = notification?.data;
  if (!orderData?.orderId) {
    throw new Error('Missing order data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'EBAY',
        marketplaceOrderId: orderData.orderId,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: orderData.orderId }, 'Order not found for payment');
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      paidAt: new Date(),
      status: 'CONFIRMED',
    },
  });

  await prisma.notification.create({
    data: {
      type: 'ORDER_PAID',
      title: '支払い完了',
      message: `eBay注文の支払いが完了しました（注文ID: ${orderData.orderId}）`,
      severity: 'SUCCESS',
      metadata: { orderId: order.id },
    },
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id }, 'eBay payment completed');
}

/**
 * eBayキャンセル処理
 */
async function processEbayCancellation(
  webhookEventId: string,
  notification: any
): Promise<void> {
  const orderData = notification?.data;
  if (!orderData?.orderId) {
    throw new Error('Missing order data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'EBAY',
        marketplaceOrderId: orderData.orderId,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: orderData.orderId }, 'Order not found for cancellation');
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'CANCELLED',
    },
  });

  await prisma.notification.create({
    data: {
      type: 'ORDER_CANCELLED',
      title: '注文キャンセル',
      message: `eBay注文がキャンセルされました（注文ID: ${orderData.orderId}）`,
      severity: 'WARNING',
      metadata: { orderId: order.id },
    },
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id }, 'eBay order cancelled');
}

/**
 * eBay在庫切れ処理
 */
async function processEbayOutOfStock(
  webhookEventId: string,
  notification: any
): Promise<void> {
  const itemData = notification?.data;
  if (!itemData?.itemId) {
    throw new Error('Missing item data');
  }

  const listing = await prisma.listing.findFirst({
    where: {
      marketplace: 'EBAY',
      marketplaceListingId: itemData.itemId,
    },
    include: { product: true },
  });

  if (!listing) {
    log.warn({ itemId: itemData.itemId }, 'Listing not found for out-of-stock');
    return;
  }

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: 'PAUSED' },
  });

  await prisma.notification.create({
    data: {
      type: 'OUT_OF_STOCK',
      title: '在庫切れ',
      message: `eBayリスティングの在庫が切れました: ${listing.product?.title || itemData.itemId}`,
      severity: 'WARNING',
      productId: listing.productId,
      listingId: listing.id,
      metadata: { itemId: itemData.itemId },
    },
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { listingId: listing.id },
  });

  log.info({ listingId: listing.id }, 'eBay item out of stock');
}

/**
 * eBay配送状況更新処理（Phase 15）
 */
async function processEbayShipmentTracking(
  webhookEventId: string,
  notification: any
): Promise<void> {
  const trackingData = notification?.data;
  if (!trackingData?.orderId) {
    throw new Error('Missing tracking data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'EBAY',
        marketplaceOrderId: trackingData.orderId,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: trackingData.orderId }, 'Order not found for tracking update');
    return;
  }

  // 追跡情報を更新
  await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingNumber: trackingData.trackingNumber || order.trackingNumber,
      trackingCarrier: trackingData.carrier || order.trackingCarrier,
      status: 'SHIPPED',
      fulfillmentStatus: 'FULFILLED',
      shippedAt: trackingData.shipDate ? new Date(trackingData.shipDate) : new Date(),
    },
  });

  // 通知を作成
  await prisma.notification.create({
    data: {
      type: 'ORDER_SHIPPED',
      title: '配送情報更新',
      message: `eBay注文の配送情報が更新されました（追跡番号: ${trackingData.trackingNumber}）`,
      severity: 'INFO',
      metadata: {
        orderId: order.id,
        trackingNumber: trackingData.trackingNumber,
        carrier: trackingData.carrier,
      },
    },
  });

  // 自動メッセージ生成トリガー（Phase 16）
  await createCustomerMessageFromEvent(webhookEventId, order.id, 'TRACKING_UPDATED', 'EBAY');

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id, trackingNumber: trackingData.trackingNumber }, 'eBay shipment tracking updated');
}

/**
 * eBay返金処理（Phase 15）
 */
async function processEbayRefund(
  webhookEventId: string,
  notification: any
): Promise<void> {
  const refundData = notification?.data;
  if (!refundData?.orderId) {
    throw new Error('Missing refund data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'EBAY',
        marketplaceOrderId: refundData.orderId,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: refundData.orderId }, 'Order not found for refund');
    return;
  }

  const refundStatus = refundData.refundStatus || 'INITIATED';
  const isCompleted = refundStatus === 'COMPLETED' || refundStatus === 'SUCCESS';

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: isCompleted ? 'REFUNDED' : order.status,
      paymentStatus: isCompleted ? 'REFUNDED' : order.paymentStatus,
    },
  });

  await prisma.notification.create({
    data: {
      type: 'ORDER_REFUNDED',
      title: isCompleted ? '返金完了' : '返金処理中',
      message: `eBay注文の返金が${isCompleted ? '完了' : '開始'}されました（注文ID: ${refundData.orderId}）`,
      severity: isCompleted ? 'SUCCESS' : 'WARNING',
      metadata: {
        orderId: order.id,
        refundAmount: refundData.refundAmount?.value,
        refundCurrency: refundData.refundAmount?.currency,
        refundStatus,
      },
    },
  });

  // 自動メッセージ生成トリガー（Phase 16）
  await createCustomerMessageFromEvent(webhookEventId, order.id, 'ORDER_REFUNDED', 'EBAY');

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id, refundStatus }, 'eBay refund processed');
}

/**
 * 顧客メッセージ生成（Phase 16）
 */
async function createCustomerMessageFromEvent(
  webhookEventId: string,
  orderId: string,
  triggerEvent: string,
  marketplace: 'EBAY' | 'JOOM'
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      log.warn({ orderId }, 'Order not found for message creation');
      return;
    }

    // 対応するテンプレートを取得
    const template = await prisma.messageTemplate.findFirst({
      where: {
        triggerEvent: triggerEvent as any,
        OR: [
          { marketplace: marketplace },
          { marketplace: null },
        ],
        isActive: true,
      },
      orderBy: [
        { marketplace: 'desc' }, // マーケットプレイス固有テンプレートを優先
        { priority: 'desc' },
      ],
    });

    if (!template) {
      log.info({ triggerEvent, marketplace }, 'No message template found for event');
      return;
    }

    // プレースホルダーを置換
    const placeholderValues: Record<string, string> = {
      buyer_name: order.buyerName || order.buyerUsername,
      order_id: order.marketplaceOrderId,
      tracking_number: order.trackingNumber || '',
      tracking_carrier: order.trackingCarrier || '',
      total: `${order.total} ${order.currency}`,
    };

    let subject = template.subject;
    let body = template.body;
    let bodyHtml = template.bodyHtml || null;

    for (const [key, value] of Object.entries(placeholderValues)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
      if (bodyHtml) {
        bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), value);
      }
    }

    // CustomerMessageを作成（PENDING状態で非同期送信）
    await prisma.customerMessage.create({
      data: {
        orderId,
        webhookEventId,
        templateId: template.id,
        marketplace,
        buyerUsername: order.buyerUsername,
        buyerEmail: order.buyerEmail,
        subject,
        body,
        bodyHtml,
        status: 'PENDING',
      },
    });

    log.info({ orderId, triggerEvent, templateId: template.id }, 'Customer message created');
  } catch (error) {
    log.error({ orderId, triggerEvent, error }, 'Failed to create customer message');
  }
}

/**
 * Joomイベント処理
 */
async function processJoomEvent(
  webhookEventId: string,
  eventType: string,
  data: any
): Promise<void> {
  switch (eventType) {
    case 'order.created':
    case 'order.status_changed':
      await processJoomOrder(webhookEventId, data);
      break;

    case 'order.paid':
      await processJoomPayment(webhookEventId, data);
      break;

    case 'order.cancelled':
      await processJoomCancellation(webhookEventId, data);
      break;

    // Phase 15: 配送状況更新
    case 'order.shipped':
    case 'order.tracking_updated':
      await processJoomShipmentTracking(webhookEventId, data);
      break;

    // Phase 15: 返金通知
    case 'order.refund_initiated':
    case 'order.refunded':
      await processJoomRefund(webhookEventId, data);
      break;

    default:
      log.info({ eventType }, 'Unhandled Joom event type');
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'IGNORED' },
      });
  }
}

/**
 * Joom注文処理
 */
async function processJoomOrder(
  webhookEventId: string,
  data: any
): Promise<void> {
  const orderData = data.order || data;
  if (!orderData.id) {
    throw new Error('Missing order data');
  }

  const existingOrder = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'JOOM',
        marketplaceOrderId: orderData.id,
      },
    },
  });

  if (existingOrder) {
    await prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        status: mapJoomOrderStatus(orderData.status),
        rawData: orderData,
      },
    });
    log.info({ orderId: existingOrder.id }, 'Joom order updated');
  } else {
    const shippingAddress = orderData.shipping_address || {};
    const items = orderData.items || [];

    const order = await prisma.order.create({
      data: {
        marketplace: 'JOOM',
        marketplaceOrderId: orderData.id,
        buyerUsername: orderData.buyer_name || 'unknown',
        buyerEmail: orderData.buyer_email,
        buyerName: orderData.buyer_name,
        shippingAddress: {
          addressLine1: shippingAddress.address_line_1,
          addressLine2: shippingAddress.address_line_2,
          city: shippingAddress.city,
          stateOrProvince: shippingAddress.state,
          postalCode: shippingAddress.postal_code,
          country: shippingAddress.country_code,
        },
        subtotal: parseFloat(orderData.subtotal || '0'),
        shippingCost: parseFloat(orderData.shipping_cost || '0'),
        tax: parseFloat(orderData.tax || '0'),
        total: parseFloat(orderData.total || '0'),
        currency: orderData.currency || 'USD',
        status: mapJoomOrderStatus(orderData.status),
        orderedAt: new Date(orderData.created_at || Date.now()),
        rawData: orderData,
      },
    });

    for (const item of items) {
      const listing = await prisma.listing.findFirst({
        where: {
          marketplace: 'JOOM',
          marketplaceListingId: item.product_id,
        },
        include: { product: true },
      });

      await prisma.sale.create({
        data: {
          orderId: order.id,
          listingId: listing?.id,
          productId: listing?.productId,
          sku: item.sku || item.product_id || 'unknown',
          title: item.title || item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          unitPrice: parseFloat(item.price || '0'),
          totalPrice: parseFloat(item.total || item.price || '0'),
          costPrice: listing?.product?.price,
          marketplaceItemId: item.product_id,
        },
      });
    }

    await prisma.notification.create({
      data: {
        type: 'ORDER_RECEIVED',
        title: '新規注文受付',
        message: `Joomで新しい注文を受け付けました（注文ID: ${orderData.id}）`,
        severity: 'SUCCESS',
        metadata: {
          orderId: order.id,
          marketplace: 'JOOM',
          total: order.total,
        },
      },
    });

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { orderId: order.id },
    });

    log.info({ orderId: order.id, marketplaceOrderId: orderData.id }, 'Joom order created');
  }
}

/**
 * Joom支払い完了処理
 */
async function processJoomPayment(
  webhookEventId: string,
  data: any
): Promise<void> {
  const orderData = data.order || data;
  if (!orderData.id) {
    throw new Error('Missing order data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'JOOM',
        marketplaceOrderId: orderData.id,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: orderData.id }, 'Order not found for payment');
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      paidAt: new Date(),
      status: 'CONFIRMED',
    },
  });

  await prisma.notification.create({
    data: {
      type: 'ORDER_PAID',
      title: '支払い完了',
      message: `Joom注文の支払いが完了しました（注文ID: ${orderData.id}）`,
      severity: 'SUCCESS',
      metadata: { orderId: order.id },
    },
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id }, 'Joom payment completed');
}

/**
 * Joomキャンセル処理
 */
async function processJoomCancellation(
  webhookEventId: string,
  data: any
): Promise<void> {
  const orderData = data.order || data;
  if (!orderData.id) {
    throw new Error('Missing order data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'JOOM',
        marketplaceOrderId: orderData.id,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: orderData.id }, 'Order not found for cancellation');
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'CANCELLED',
    },
  });

  await prisma.notification.create({
    data: {
      type: 'ORDER_CANCELLED',
      title: '注文キャンセル',
      message: `Joom注文がキャンセルされました（注文ID: ${orderData.id}）`,
      severity: 'WARNING',
      metadata: { orderId: order.id },
    },
  });

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id }, 'Joom order cancelled');
}

/**
 * Joom配送状況更新処理（Phase 15）
 */
async function processJoomShipmentTracking(
  webhookEventId: string,
  data: any
): Promise<void> {
  const trackingData = data.order || data;
  if (!trackingData.id) {
    throw new Error('Missing tracking data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'JOOM',
        marketplaceOrderId: trackingData.id,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: trackingData.id }, 'Order not found for tracking update');
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingNumber: trackingData.tracking_number || order.trackingNumber,
      trackingCarrier: trackingData.carrier || order.trackingCarrier,
      status: 'SHIPPED',
      fulfillmentStatus: 'FULFILLED',
      shippedAt: trackingData.shipped_at ? new Date(trackingData.shipped_at) : new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      type: 'ORDER_SHIPPED',
      title: '配送情報更新',
      message: `Joom注文の配送情報が更新されました（追跡番号: ${trackingData.tracking_number}）`,
      severity: 'INFO',
      metadata: {
        orderId: order.id,
        trackingNumber: trackingData.tracking_number,
        carrier: trackingData.carrier,
      },
    },
  });

  // 自動メッセージ生成トリガー（Phase 16）
  await createCustomerMessageFromEvent(webhookEventId, order.id, 'TRACKING_UPDATED', 'JOOM');

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id, trackingNumber: trackingData.tracking_number }, 'Joom shipment tracking updated');
}

/**
 * Joom返金処理（Phase 15）
 */
async function processJoomRefund(
  webhookEventId: string,
  data: any
): Promise<void> {
  const refundData = data.order || data;
  if (!refundData.id) {
    throw new Error('Missing refund data');
  }

  const order = await prisma.order.findUnique({
    where: {
      marketplace_marketplaceOrderId: {
        marketplace: 'JOOM',
        marketplaceOrderId: refundData.id,
      },
    },
  });

  if (!order) {
    log.warn({ marketplaceOrderId: refundData.id }, 'Order not found for refund');
    return;
  }

  const refundStatus = refundData.refund_status || data.event;
  const isCompleted = refundStatus === 'order.refunded' || refundStatus === 'completed';

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: isCompleted ? 'REFUNDED' : order.status,
      paymentStatus: isCompleted ? 'REFUNDED' : order.paymentStatus,
    },
  });

  await prisma.notification.create({
    data: {
      type: 'ORDER_REFUNDED',
      title: isCompleted ? '返金完了' : '返金処理中',
      message: `Joom注文の返金が${isCompleted ? '完了' : '開始'}されました（注文ID: ${refundData.id}）`,
      severity: isCompleted ? 'SUCCESS' : 'WARNING',
      metadata: {
        orderId: order.id,
        refundAmount: refundData.refund_amount,
        refundStatus,
      },
    },
  });

  // 自動メッセージ生成トリガー（Phase 16）
  await createCustomerMessageFromEvent(webhookEventId, order.id, 'ORDER_REFUNDED', 'JOOM');

  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { orderId: order.id },
  });

  log.info({ orderId: order.id, refundStatus }, 'Joom refund processed');
}

/**
 * eBay注文ステータスマッピング
 */
function mapEbayOrderStatus(
  status: string
): 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTE' {
  const statusMap: Record<string, any> = {
    'NOT_STARTED': 'PENDING',
    'IN_PROGRESS': 'PROCESSING',
    'FULFILLED': 'SHIPPED',
    'COMPLETE': 'DELIVERED',
    'CANCELLED': 'CANCELLED',
  };
  return statusMap[status] || 'PENDING';
}

/**
 * eBay支払いステータスマッピング
 */
function mapEbayPaymentStatus(
  status: string
): 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' {
  const statusMap: Record<string, any> = {
    'PENDING': 'PENDING',
    'FULLY_PAID': 'PAID',
    'PAID': 'PAID',
    'FULLY_REFUNDED': 'REFUNDED',
    'PARTIALLY_REFUNDED': 'PAID',
    'FAILED': 'FAILED',
  };
  return statusMap[status] || 'PENDING';
}

/**
 * Joom注文ステータスマッピング
 */
function mapJoomOrderStatus(
  status: string
): 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTE' {
  const statusMap: Record<string, any> = {
    'pending': 'PENDING',
    'processing': 'PROCESSING',
    'shipped': 'SHIPPED',
    'delivered': 'DELIVERED',
    'cancelled': 'CANCELLED',
    'refunded': 'REFUNDED',
  };
  return statusMap[status?.toLowerCase()] || 'PENDING';
}

/**
 * Webhookイベント一覧取得（管理用）
 */
router.get('/events', async (req, res, next) => {
  try {
    const { provider, status, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (provider) where.provider = provider;
    if (status) where.status = status;

    const [events, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookEvent.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Webhookイベント再処理
 */
router.post('/events/:id/retry', async (req, res, next) => {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: req.params.id },
    });

    if (!event) {
      throw new AppError(404, 'Webhook event not found', 'NOT_FOUND');
    }

    // リトライカウントを増やして再処理
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        errorMessage: null,
      },
    });

    // イベントを再処理
    if (event.provider === 'EBAY') {
      await processEbayEvent(event.id, event.eventType, (event.payload as any)?.notification);
    } else if (event.provider === 'JOOM') {
      await processJoomEvent(event.id, event.eventType, event.payload);
    }

    const updatedEvent = await prisma.webhookEvent.findUnique({
      where: { id: event.id },
    });

    res.json({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    next(error);
  }
});

export { router as webhooksRouter };
