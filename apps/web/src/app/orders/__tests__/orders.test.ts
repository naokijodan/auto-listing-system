import { describe, it, expect } from 'vitest';
import {
  orderStatsSchema,
  orderSchema,
  updateStatusSchema,
  addTrackingSchema,
  statusLabels,
  paymentStatusLabels,
  marketplaceLabels,
  CARRIER_OPTIONS,
} from '../types';

describe('/orders types', () => {
  describe('orderStatsSchema の検証', () => {
    it('正常データは parse に成功する', () => {
      const data = {
        totalOrders: 100,
        pendingOrders: 5,
        paidOrders: 80,
        shippedOrders: 70,
        totalRevenue: 123456.78,
        totalProfit: 23456.78,
        avgOrderValue: 1234.56,
        recentOrders: 10,
      };
      expect(() => orderStatsSchema.parse(data)).not.toThrow();
    });

    it('不正データ（number でない）は parse に失敗する', () => {
      const bad = {
        totalOrders: '100',
        pendingOrders: 5,
        paidOrders: 80,
        shippedOrders: 70,
        totalRevenue: 123456.78,
        totalProfit: 23456.78,
        avgOrderValue: 1234.56,
        recentOrders: 10,
      } as unknown;
      expect(() => orderStatsSchema.parse(bad)).toThrow();
    });

    it('必須フィールド欠落は parse に失敗する', () => {
      const bad = {
        // totalOrders 欠落
        pendingOrders: 5,
        paidOrders: 80,
        shippedOrders: 70,
        totalRevenue: 123456.78,
        totalProfit: 23456.78,
        avgOrderValue: 1234.56,
        recentOrders: 10,
      } as unknown;
      expect(() => orderStatsSchema.parse(bad)).toThrow();
    });
  });

  describe('orderSchema の検証', () => {
    const baseOrder = {
      id: 'ord_1',
      marketplace: 'EBAY' as const,
      marketplaceOrderId: 'EB-123',
      buyerUsername: 'buyer1',
      shippingAddress: {},
      subtotal: 100,
      shippingCost: 10,
      tax: 0,
      total: 110,
      currency: 'JPY',
      marketplaceFee: 5,
      paymentFee: 3,
      status: 'PENDING',
      paymentStatus: 'PAID',
      fulfillmentStatus: 'PROCESSING',
      orderedAt: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      sales: [],
    };

    it('必須とオプショナル省略のみでも parse 成功（最小構成）', () => {
      expect(() => orderSchema.parse(baseOrder)).not.toThrow();
    });

    it('sales が空配列でも parse 成功する', () => {
      const order = { ...baseOrder, sales: [] };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it("marketplace が 'EBAY' | 'JOOM' 以外で失敗する", () => {
      const bad = { ...baseOrder, marketplace: 'AMAZON' } as unknown;
      expect(() => orderSchema.parse(bad)).toThrow();
    });

    it('必須フィールド欠落（id）で parse 失敗', () => {
      const { id, ...rest } = baseOrder as any;
      expect(() => orderSchema.parse(rest)).toThrow();
    });

    it('数値フィールドが string の場合は失敗（subtotal）', () => {
      const bad = { ...baseOrder, subtotal: '100' } as unknown;
      expect(() => orderSchema.parse(bad)).toThrow();
    });

    it('shippingAddress の任意フィールドがあっても parse 成功', () => {
      const order = {
        ...baseOrder,
        shippingAddress: {
          street: '1-2-3',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'JP',
        },
      };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it('sales に1件の明細（必須のみ）でも parse 成功', () => {
      const order = {
        ...baseOrder,
        sales: [
          {
            id: 'sale_1',
            sku: 'SKU-1',
            title: 'Item 1',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
          },
        ],
      };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it('sales の任意フィールド（profitJpy 等）を含んでも parse 成功', () => {
      const order = {
        ...baseOrder,
        sales: [
          {
            id: 'sale_1',
            sku: 'SKU-1',
            title: 'Item 1',
            quantity: 2,
            unitPrice: 50,
            totalPrice: 100,
            costPrice: 30,
            profitJpy: 40,
            profitRate: 0.4,
          },
        ],
      };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it('sales の必須フィールド欠落（sku）で parse 失敗', () => {
      const order = {
        ...baseOrder,
        sales: [
          {
            id: 'sale_1',
            // sku 欠落
            title: 'Item 1',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
          } as any,
        ],
      } as const;
      expect(() => orderSchema.parse(order)).toThrow();
    });

    it('tracking フィールド省略でも parse 成功', () => {
      const order = { ...baseOrder };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it('tracking フィールド指定でも parse 成功', () => {
      const order = {
        ...baseOrder,
        trackingNumber: 'ABC123',
        trackingCarrier: 'DHL',
      };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it('buyerEmail, buyerName の省略でも parse 成功', () => {
      const order = { ...baseOrder };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it('paidAt, shippedAt の省略でも parse 成功', () => {
      const order = { ...baseOrder };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });

    it('shippingAddress 自体の欠落は失敗', () => {
      const bad = { ...baseOrder } as any;
      delete bad.shippingAddress;
      expect(() => orderSchema.parse(bad)).toThrow();
    });

    it('total や手数料等の数値が負でも zod 的には通る', () => {
      const order = { ...baseOrder, total: -1, marketplaceFee: -5, paymentFee: -1 };
      expect(() => orderSchema.parse(order)).not.toThrow();
    });
  });

  describe('updateStatusSchema の検証', () => {
    it('正常データは parse に成功', () => {
      const data = { status: 'SHIPPED' };
      expect(() => updateStatusSchema.parse(data)).not.toThrow();
    });

    it('status 未定義で parse に失敗', () => {
      const bad = {} as unknown;
      expect(() => updateStatusSchema.parse(bad)).toThrow();
    });

    it('fulfillmentStatus はオプショナル（指定しても成功）', () => {
      const data = { status: 'SHIPPED', fulfillmentStatus: 'DELIVERED' };
      expect(() => updateStatusSchema.parse(data)).not.toThrow();
    });

    it('paymentStatus もオプショナル（指定しても成功）', () => {
      const data = { status: 'SHIPPED', paymentStatus: 'PAID' };
      expect(() => updateStatusSchema.parse(data)).not.toThrow();
    });
  });

  describe('addTrackingSchema の検証', () => {
    it('正常データは parse に成功し、trim が適用される', () => {
      const parsed = addTrackingSchema.parse({ trackingNumber: '  ABC123  ', trackingCarrier: 'DHL' });
      expect(parsed.trackingNumber).toBe('ABC123');
      expect(parsed.trackingCarrier).toBe('DHL');
    });

    it('trackingNumber が 3文字未満で失敗', () => {
      expect(() => addTrackingSchema.parse({ trackingNumber: 'ab', trackingCarrier: 'DHL' })).toThrow();
    });

    it('trackingNumber が空文字で失敗', () => {
      expect(() => addTrackingSchema.parse({ trackingNumber: '', trackingCarrier: 'DHL' })).toThrow();
    });

    it('空白のみの追跡番号は trim 後に min(3) で失敗', () => {
      expect(() => addTrackingSchema.parse({ trackingNumber: '   ', trackingCarrier: 'DHL' })).toThrow();
    });

    it('trackingCarrier が空文字で失敗', () => {
      expect(() => addTrackingSchema.parse({ trackingNumber: 'ABC123', trackingCarrier: '' })).toThrow();
    });

    it('trim 後にちょうど3文字なら成功', () => {
      const parsed = addTrackingSchema.parse({ trackingNumber: '  ABC  ', trackingCarrier: 'FedEx' });
      expect(parsed.trackingNumber).toBe('ABC');
    });
  });

  describe('定数の検証', () => {
    it('statusLabels: 8ステータス全てに label, color, icon が定義', () => {
      const expectedKeys = [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
        'DISPUTE',
      ];
      expect(Object.keys(statusLabels).sort()).toEqual(expectedKeys.sort());
      for (const key of expectedKeys) {
        const v = (statusLabels as any)[key];
        expect(typeof v.label).toBe('string');
        expect(typeof v.color).toBe('string');
        expect(v.icon).toBeDefined();
      }
    });

    it('paymentStatusLabels: 4ステータス全てに label, color が定義', () => {
      const expectedKeys = ['PENDING', 'PAID', 'REFUNDED', 'FAILED'];
      expect(Object.keys(paymentStatusLabels).sort()).toEqual(expectedKeys.sort());
      for (const key of expectedKeys) {
        const v = (paymentStatusLabels as any)[key];
        expect(typeof v.label).toBe('string');
        expect(typeof v.color).toBe('string');
      }
    });

    it('marketplaceLabels: EBAY, JOOM が定義されている', () => {
      expect(Object.keys(marketplaceLabels).sort()).toEqual(['EBAY', 'JOOM']);
      expect(typeof marketplaceLabels.EBAY.label).toBe('string');
      expect(typeof marketplaceLabels.JOOM.label).toBe('string');
    });

    it('CARRIER_OPTIONS: 7件のキャリアが含まれている', () => {
      expect(CARRIER_OPTIONS.length).toBe(7);
    });

    it('CARRIER_OPTIONS: 代表的なキャリア名が含まれる', () => {
      expect(CARRIER_OPTIONS).toEqual(
        expect.arrayContaining(['Japan Post', 'DHL', 'FedEx', 'EMS', 'Yamato', 'Sagawa', 'その他'])
      );
    });
  });
});

