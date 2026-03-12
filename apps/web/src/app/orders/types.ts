import { z } from 'zod';
import { Clock, Package } from 'lucide-react';

// Constants
export const CARRIER_OPTIONS = [
  'Japan Post',
  'DHL',
  'FedEx',
  'EMS',
  'Yamato',
  'Sagawa',
  'その他',
] as const;

// Label Type Definitions
export interface StatusLabel {
  label: string;
  color: string;
  icon: typeof Clock | typeof Package;
}

export type StatusLabels = Record<string, StatusLabel>;

export interface SimpleLabel {
  label: string;
  color: string;
}

export type PaymentStatusLabels = Record<string, SimpleLabel>;
export type MarketplaceLabels = Record<string, SimpleLabel>;

// Label Maps
export const statusLabels: StatusLabels = {
  PENDING: {
    label: '保留中',
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  CONFIRMED: {
    label: '確認済',
    color:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Package, // using Package icon to diversify
  },
  PROCESSING: {
    label: '処理中',
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Package,
  },
  SHIPPED: {
    label: '発送済',
    color:
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    icon: Package,
  },
  DELIVERED: {
    label: '配達完了',
    color:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: Package,
  },
  CANCELLED: {
    label: 'キャンセル',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: Package,
  },
  REFUNDED: {
    label: '返金済',
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    icon: Package,
  },
  DISPUTE: {
    label: '紛争中',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: Package,
  },
};

export const paymentStatusLabels: PaymentStatusLabels = {
  PENDING: { label: '未払い', color: 'text-yellow-600 dark:text-yellow-400' },
  PAID: { label: '支払済', color: 'text-emerald-600 dark:text-emerald-400' },
  REFUNDED: { label: '返金済', color: 'text-orange-600 dark:text-orange-400' },
  FAILED: { label: '失敗', color: 'text-red-600 dark:text-red-400' },
};

export const marketplaceLabels: MarketplaceLabels = {
  EBAY: { label: 'eBay', color: 'bg-blue-500' },
  JOOM: { label: 'Joom', color: 'bg-orange-500' },
};

// Component Props
export interface StatCardProps {
  title: string;
  value: number | string;
  icon: typeof Package;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
  subtext?: string;
}

export interface OrderCardProps {
  order: import('@/lib/hooks').Order;
  isExpanded: boolean;
  onToggle: () => void;
  onCopyOrderId: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onAddTracking: (id: string) => void; // opens modal
}

// Zod Schemas
export const orderStatsSchema = z.object({
  totalOrders: z.number(),
  pendingOrders: z.number(),
  paidOrders: z.number(),
  shippedOrders: z.number(),
  totalRevenue: z.number(),
  totalProfit: z.number(),
  avgOrderValue: z.number(),
  recentOrders: z.number(),
});

export const orderSchema = z.object({
  id: z.string(),
  marketplace: z.enum(['EBAY', 'JOOM']),
  marketplaceOrderId: z.string(),
  buyerUsername: z.string(),
  buyerEmail: z.string().optional(),
  buyerName: z.string().optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }),
  subtotal: z.number(),
  shippingCost: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
  marketplaceFee: z.number(),
  paymentFee: z.number(),
  status: z.string(),
  paymentStatus: z.string(),
  fulfillmentStatus: z.string(),
  trackingNumber: z.string().optional(),
  trackingCarrier: z.string().optional(),
  shippedAt: z.string().optional(),
  orderedAt: z.string(),
  paidAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sales: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      title: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      costPrice: z.number().optional(),
      profitJpy: z.number().optional(),
      profitRate: z.number().optional(),
    })
  ),
});

export const updateStatusSchema = z.object({
  status: z.string(),
  paymentStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
});

export const addTrackingSchema = z.object({
  // Ensure trimming occurs before min length validation
  trackingNumber: z.string().trim().min(3),
  trackingCarrier: z.string().min(1),
});
