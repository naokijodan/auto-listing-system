
/**
 * サプライヤー管理API
 * Phase 78: サプライヤー管理機能
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();

/**
 * 発注番号を生成
 */
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${year}-${random}`;
}

/**
 * @swagger
 * /api/suppliers/stats:
 *   get:
 *     summary: サプライヤー統計を取得
 *     tags: [Suppliers]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalSuppliers,
      activeSuppliers,
      totalProducts,
      pendingOrders,
      totalOrderValue,
    ] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { status: 'ACTIVE' } }),
      prisma.supplierProduct.count(),
      prisma.purchaseOrder.count({
        where: {
          status: { in: ['PENDING', 'APPROVED', 'ORDERED'] },
        },
      }),
      prisma.purchaseOrder.aggregate({
        where: {
          status: { in: ['ORDERED', 'SHIPPED', 'DELIVERED'] },
        },
        _sum: { total: true },
      }),
    ]);

    // 月間発注額
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyOrders = await prisma.purchaseOrder.aggregate({
      where: {
        orderedAt: { gte: thisMonth },
        status: { in: ['ORDERED', 'SHIPPED', 'DELIVERED'] },
      },
      _sum: { total: true },
      _count: true,
    });

    // トップサプライヤー（発注額順）
    const topSuppliers = await prisma.purchaseOrder.groupBy({
      by: ['supplierId'],
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    });

    const supplierDetails = await prisma.supplier.findMany({
      where: { id: { in: topSuppliers.map(s => s.supplierId) } },
      select: { id: true, name: true, code: true },
    });

    const topSuppliersWithDetails = topSuppliers.map(s => ({
      ...s,
      supplier: supplierDetails.find(d => d.id === s.supplierId),
    }));

    res.json({
      totalSuppliers,
      activeSuppliers,
      totalProducts,
      pendingOrders,
      totalOrderValue: totalOrderValue._sum.total || 0,
      monthlyOrderValue: monthlyOrders._sum.total || 0,
      monthlyOrderCount: monthlyOrders._count,
      topSuppliers: topSuppliersWithDetails,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: サプライヤー一覧を取得
 *     tags: [Suppliers]
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({
      data: suppliers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: サプライヤーを作成
 *     tags: [Suppliers]
 */
router.post('/', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        website: req.body.website,
        address: req.body.address,
        city: req.body.city,
        prefecture: req.body.prefecture,
        postalCode: req.body.postalCode,
        country: req.body.country || 'JP',
        paymentTerms: req.body.paymentTerms,
        currency: req.body.currency || 'JPY',
        notes: req.body.notes,
      },
    });

    logger.info(`Supplier created: ${supplier.id} - ${supplier.name}`);
    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: サプライヤー詳細を取得
 *     tags: [Suppliers]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        products: {
          take: 20,
          orderBy: { updatedAt: 'desc' },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                supplierProduct: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   patch:
 *     summary: サプライヤーを更新
 *     tags: [Suppliers]
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.contactName !== undefined && { contactName: req.body.contactName }),
        ...(req.body.contactEmail !== undefined && { contactEmail: req.body.contactEmail }),
        ...(req.body.contactPhone !== undefined && { contactPhone: req.body.contactPhone }),
        ...(req.body.website !== undefined && { website: req.body.website }),
        ...(req.body.address !== undefined && { address: req.body.address }),
        ...(req.body.city !== undefined && { city: req.body.city }),
        ...(req.body.prefecture !== undefined && { prefecture: req.body.prefecture }),
        ...(req.body.postalCode !== undefined && { postalCode: req.body.postalCode }),
        ...(req.body.country !== undefined && { country: req.body.country }),
        ...(req.body.paymentTerms !== undefined && { paymentTerms: req.body.paymentTerms }),
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.rating !== undefined && { rating: req.body.rating }),
        ...(req.body.notes !== undefined && { notes: req.body.notes }),
      },
    });

    res.json(supplier);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: サプライヤーを削除
 *     tags: [Suppliers]
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // 関連する発注がないか確認
    const orderCount = await prisma.purchaseOrder.count({
      where: { supplierId: req.params.id },
    });

    if (orderCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete supplier with existing orders',
      });
    }

    await prisma.supplier.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ========================================
// サプライヤー商品
// ========================================

/**
 * @swagger
 * /api/suppliers/{id}/products:
 *   get:
 *     summary: サプライヤー商品一覧を取得
 *     tags: [Suppliers]
 */
router.get('/:id/products', async (req, res, next) => {
  try {
    const { search, isAvailable, page = '1', limit = '50' } = req.query;

    const where: Record<string, unknown> = {
      supplierId: req.params.id,
    };
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [products, total] = await Promise.all([
      prisma.supplierProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.supplierProduct.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/{id}/products:
 *   post:
 *     summary: サプライヤー商品を追加
 *     tags: [Suppliers]
 */
router.post('/:id/products', async (req, res, next) => {
  try {
    const product = await prisma.supplierProduct.create({
      data: {
        supplierId: req.params.id,
        sku: req.body.sku,
        name: req.body.name,
        description: req.body.description,
        unitPrice: req.body.unitPrice,
        currency: req.body.currency || 'JPY',
        minOrderQty: req.body.minOrderQty || 1,
        priceBreaks: req.body.priceBreaks || [],
        stockLevel: req.body.stockLevel,
        leadTime: req.body.leadTime,
        category: req.body.category,
        brand: req.body.brand,
        sourceUrl: req.body.sourceUrl,
        productId: req.body.productId,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/products/{productId}:
 *   patch:
 *     summary: サプライヤー商品を更新
 *     tags: [Suppliers]
 */
router.patch('/products/:productId', async (req, res, next) => {
  try {
    const product = await prisma.supplierProduct.update({
      where: { id: req.params.productId },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.unitPrice !== undefined && {
          unitPrice: req.body.unitPrice,
          lastPriceUpdate: new Date(),
        }),
        ...(req.body.stockLevel !== undefined && {
          stockLevel: req.body.stockLevel,
          lastStockCheck: new Date(),
        }),
        ...(req.body.leadTime !== undefined && { leadTime: req.body.leadTime }),
        ...(req.body.isAvailable !== undefined && { isAvailable: req.body.isAvailable }),
        ...(req.body.priceBreaks && { priceBreaks: req.body.priceBreaks }),
      },
    });

    res.json(product);
  } catch (error) {
    next(error);
  }
});

// ========================================
// 発注管理
// ========================================

/**
 * @swagger
 * /api/suppliers/orders:
 *   get:
 *     summary: 発注一覧を取得
 *     tags: [Suppliers]
 */
router.get('/orders/list', async (req, res, next) => {
  try {
    const { status, supplierId, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, code: true },
          },
          items: {
            include: {
              supplierProduct: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/orders:
 *   post:
 *     summary: 発注を作成
 *     tags: [Suppliers]
 */
router.post('/orders', async (req, res, next) => {
  try {
    const { supplierId, items, notes, expectedAt, relatedOrderId } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({ error: 'supplierId and items are required' });
    }

    // 商品情報を取得
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: {
        id: { in: items.map((i: any) => i.supplierProductId) },
      },
    });

    // 合計金額を計算
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const product = supplierProducts.find(p => p.id === item.supplierProductId);
      if (!product) {
        throw new Error(`Product not found: ${item.supplierProductId}`);
      }
      const lineTotal = product.unitPrice * item.quantity;
      subtotal += lineTotal;
      return {
        supplierProductId: item.supplierProductId,
        quantity: item.quantity,
        unitPrice: product.unitPrice,
        lineTotal,
        notes: item.notes,
      };
    });

    const tax = Math.round(subtotal * 0.1); // 10% tax
    const total = subtotal + tax;

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        orderNumber: generateOrderNumber(),
        relatedOrderId,
        subtotal,
        tax,
        total,
        currency: 'JPY',
        status: 'DRAFT',
        expectedAt: expectedAt ? new Date(expectedAt) : undefined,
        notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            supplierProduct: true,
          },
        },
      },
    });

    logger.info(`Purchase order created: ${order.orderNumber}`);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/orders/{id}:
 *   get:
 *     summary: 発注詳細を取得
 *     tags: [Suppliers]
 */
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: {
          include: {
            supplierProduct: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/orders/{id}/status:
 *   patch:
 *     summary: 発注ステータスを更新
 *     tags: [Suppliers]
 */
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status, trackingNumber, notes } = req.body;

    const updateData: Record<string, unknown> = { status };

    switch (status) {
      case 'APPROVED':
        updateData.approvedAt = new Date();
        updateData.approvedBy = req.body.approvedBy || 'system';
        break;
      case 'ORDERED':
        updateData.orderedAt = new Date();
        break;
      case 'SHIPPED':
        if (trackingNumber) {
          updateData.trackingNumber = trackingNumber;
        }
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        supplier: true,
        items: true,
      },
    });

    logger.info(`Purchase order ${order.orderNumber} status updated to ${status}`);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/orders/{id}/receive:
 *   post:
 *     summary: 入荷処理
 *     tags: [Suppliers]
 */
router.post('/orders/:id/receive', async (req, res, next) => {
  try {
    const { items } = req.body;

    // 各アイテムの入荷数を更新
    for (const item of items) {
      await prisma.purchaseOrderItem.update({
        where: { id: item.itemId },
        data: {
          receivedQty: { increment: item.quantity },
          receivedAt: new Date(),
        },
      });
    }

    // すべてのアイテムが入荷完了か確認
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (order) {
      const allReceived = order.items.every(
        item => item.receivedQty >= item.quantity
      );

      if (allReceived) {
        await prisma.purchaseOrder.update({
          where: { id: req.params.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/orders/{id}:
 *   delete:
 *     summary: 発注を削除
 *     tags: [Suppliers]
 */
router.delete('/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!['DRAFT', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({
        error: 'Can only delete draft or cancelled orders',
      });
    }

    await prisma.purchaseOrder.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/suppliers/recommendations:
 *   get:
 *     summary: 発注推奨を取得
 *     tags: [Suppliers]
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    // 在庫が少ない商品で、サプライヤー紐付けがあるもの
    const lowStockProducts = await prisma.product.findMany({
      where: {
        status: { in: ['ACTIVE', 'APPROVED'] },
      },
      take: 20,
    });

    // 関連するサプライヤー商品を取得
    const productIds = lowStockProducts.map(p => p.id);
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: {
        productId: { in: productIds },
        isAvailable: true,
      },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const recommendations = supplierProducts.map(sp => ({
      productId: sp.productId,
      supplierProduct: sp,
      supplier: sp.supplier,
      recommendedQty: sp.minOrderQty,
      estimatedCost: sp.unitPrice * sp.minOrderQty,
      estimatedLeadTime: sp.leadTime,
    }));

    res.json({ recommendations });
  } catch (error) {
    next(error);
  }
});

export { router as suppliersRouter };
