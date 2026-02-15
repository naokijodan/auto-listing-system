import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// 型定義
// ============================================================

// 出荷ステータス
type ShipmentStatus =
  | 'PENDING'
  | 'LABEL_CREATED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'EXCEPTION'
  | 'RETURNED';

// キャリア
type Carrier =
  | 'USPS'
  | 'FEDEX'
  | 'UPS'
  | 'DHL'
  | 'YAMATO'
  | 'SAGAWA'
  | 'JAPAN_POST'
  | 'EMS'
  | 'OTHER';

// 例外タイプ
type ExceptionType =
  | 'ADDRESS_ISSUE'
  | 'CUSTOMS_DELAY'
  | 'WEATHER_DELAY'
  | 'DAMAGED'
  | 'LOST'
  | 'REFUSED'
  | 'OTHER';

// 出荷インターフェース
interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  listingId: string;
  itemTitle: string;
  buyerName: string;
  buyerAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  carrier: Carrier;
  trackingNumber: string;
  status: ShipmentStatus;
  labelUrl?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  weight: number; // kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingCost: number;
  currency: string;
  insuranceAmount?: number;
  signatureRequired: boolean;
  events: TrackingEvent[];
  exception?: {
    type: ExceptionType;
    description: string;
    occurredAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

// 追跡イベント
interface TrackingEvent {
  timestamp: string;
  status: ShipmentStatus;
  location: string;
  description: string;
}

// ラベル設定
interface LabelConfig {
  id: string;
  carrier: Carrier;
  serviceType: string;
  labelSize: 'LETTER' | '4X6' | '4X8';
  printFormat: 'PDF' | 'ZPL' | 'PNG';
  isDefault: boolean;
}

// 一括出荷ジョブ
interface BulkShipmentJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

// モックデータ
const mockShipments: Shipment[] = [
  {
    id: 'ship_001',
    orderId: 'ord_001',
    orderNumber: 'EB-2026-001234',
    listingId: 'lst_001',
    itemTitle: 'Vintage Watch Collection - Seiko 5',
    buyerName: 'John Smith',
    buyerAddress: {
      name: 'John Smith',
      street1: '123 Main Street',
      street2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    carrier: 'FEDEX',
    trackingNumber: 'FX123456789012',
    status: 'IN_TRANSIT',
    labelUrl: 'https://example.com/labels/ship_001.pdf',
    estimatedDelivery: '2026-02-18T18:00:00Z',
    weight: 0.5,
    dimensions: { length: 20, width: 15, height: 10 },
    shippingCost: 24.99,
    currency: 'USD',
    insuranceAmount: 500,
    signatureRequired: true,
    events: [
      {
        timestamp: '2026-02-15T10:00:00Z',
        status: 'LABEL_CREATED',
        location: 'Tokyo, Japan',
        description: 'Shipping label created',
      },
      {
        timestamp: '2026-02-15T14:30:00Z',
        status: 'PICKED_UP',
        location: 'Tokyo, Japan',
        description: 'Package picked up by carrier',
      },
      {
        timestamp: '2026-02-15T18:00:00Z',
        status: 'IN_TRANSIT',
        location: 'Narita Airport, Japan',
        description: 'Departed facility',
      },
    ],
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T18:00:00Z',
  },
  {
    id: 'ship_002',
    orderId: 'ord_002',
    orderNumber: 'EB-2026-001235',
    listingId: 'lst_002',
    itemTitle: 'Retro Camera - Canon AE-1',
    buyerName: 'Emma Johnson',
    buyerAddress: {
      name: 'Emma Johnson',
      street1: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
    },
    carrier: 'EMS',
    trackingNumber: 'EJ123456789JP',
    status: 'OUT_FOR_DELIVERY',
    estimatedDelivery: '2026-02-15T20:00:00Z',
    weight: 0.8,
    shippingCost: 32.50,
    currency: 'USD',
    signatureRequired: false,
    events: [
      {
        timestamp: '2026-02-12T10:00:00Z',
        status: 'LABEL_CREATED',
        location: 'Tokyo, Japan',
        description: 'Label created',
      },
      {
        timestamp: '2026-02-12T15:00:00Z',
        status: 'PICKED_UP',
        location: 'Tokyo, Japan',
        description: 'Picked up',
      },
      {
        timestamp: '2026-02-13T08:00:00Z',
        status: 'IN_TRANSIT',
        location: 'Los Angeles, CA',
        description: 'Arrived at destination country',
      },
      {
        timestamp: '2026-02-15T07:00:00Z',
        status: 'OUT_FOR_DELIVERY',
        location: 'Los Angeles, CA',
        description: 'Out for delivery',
      },
    ],
    createdAt: '2026-02-12T09:00:00Z',
    updatedAt: '2026-02-15T07:00:00Z',
  },
  {
    id: 'ship_003',
    orderId: 'ord_003',
    orderNumber: 'EB-2026-001236',
    listingId: 'lst_003',
    itemTitle: 'Vintage Lens - Minolta 50mm',
    buyerName: 'Michael Brown',
    buyerAddress: {
      name: 'Michael Brown',
      street1: '789 Pine Street',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'US',
    },
    carrier: 'JAPAN_POST',
    trackingNumber: 'JP987654321012',
    status: 'DELIVERED',
    estimatedDelivery: '2026-02-14T18:00:00Z',
    actualDelivery: '2026-02-14T15:30:00Z',
    weight: 0.3,
    shippingCost: 18.00,
    currency: 'USD',
    signatureRequired: false,
    events: [
      {
        timestamp: '2026-02-10T10:00:00Z',
        status: 'LABEL_CREATED',
        location: 'Tokyo, Japan',
        description: 'Label created',
      },
      {
        timestamp: '2026-02-10T14:00:00Z',
        status: 'PICKED_UP',
        location: 'Tokyo, Japan',
        description: 'Picked up',
      },
      {
        timestamp: '2026-02-12T09:00:00Z',
        status: 'IN_TRANSIT',
        location: 'Chicago, IL',
        description: 'Arrived at destination',
      },
      {
        timestamp: '2026-02-14T08:00:00Z',
        status: 'OUT_FOR_DELIVERY',
        location: 'Chicago, IL',
        description: 'Out for delivery',
      },
      {
        timestamp: '2026-02-14T15:30:00Z',
        status: 'DELIVERED',
        location: 'Chicago, IL',
        description: 'Delivered to recipient',
      },
    ],
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-14T15:30:00Z',
  },
  {
    id: 'ship_004',
    orderId: 'ord_004',
    orderNumber: 'EB-2026-001237',
    listingId: 'lst_004',
    itemTitle: 'Antique Clock - German Cuckoo',
    buyerName: 'Sarah Davis',
    buyerAddress: {
      name: 'Sarah Davis',
      street1: '321 Elm Street',
      city: 'Houston',
      state: 'TX',
      postalCode: '77001',
      country: 'US',
    },
    carrier: 'DHL',
    trackingNumber: 'DH456789012345',
    status: 'EXCEPTION',
    estimatedDelivery: '2026-02-14T18:00:00Z',
    weight: 2.5,
    dimensions: { length: 40, width: 30, height: 50 },
    shippingCost: 65.00,
    currency: 'USD',
    insuranceAmount: 800,
    signatureRequired: true,
    events: [
      {
        timestamp: '2026-02-11T10:00:00Z',
        status: 'LABEL_CREATED',
        location: 'Tokyo, Japan',
        description: 'Label created',
      },
      {
        timestamp: '2026-02-11T16:00:00Z',
        status: 'PICKED_UP',
        location: 'Tokyo, Japan',
        description: 'Picked up',
      },
      {
        timestamp: '2026-02-13T12:00:00Z',
        status: 'EXCEPTION',
        location: 'Houston, TX',
        description: 'Address issue - unable to deliver',
      },
    ],
    exception: {
      type: 'ADDRESS_ISSUE',
      description: 'Incomplete address - apartment number missing',
      occurredAt: '2026-02-13T12:00:00Z',
    },
    createdAt: '2026-02-11T09:00:00Z',
    updatedAt: '2026-02-13T12:00:00Z',
  },
  {
    id: 'ship_005',
    orderId: 'ord_005',
    orderNumber: 'EB-2026-001238',
    listingId: 'lst_005',
    itemTitle: 'Vintage Watch - Omega Seamaster',
    buyerName: 'Robert Wilson',
    buyerAddress: {
      name: 'Robert Wilson',
      street1: '555 Beach Road',
      city: 'Miami',
      state: 'FL',
      postalCode: '33101',
      country: 'US',
    },
    carrier: 'USPS',
    trackingNumber: 'US789012345678',
    status: 'PENDING',
    weight: 0.4,
    shippingCost: 15.99,
    currency: 'USD',
    signatureRequired: false,
    events: [],
    createdAt: '2026-02-15T14:00:00Z',
    updatedAt: '2026-02-15T14:00:00Z',
  },
];

const mockLabelConfigs: LabelConfig[] = [
  {
    id: 'lbl_001',
    carrier: 'FEDEX',
    serviceType: 'International Priority',
    labelSize: '4X6',
    printFormat: 'PDF',
    isDefault: true,
  },
  {
    id: 'lbl_002',
    carrier: 'EMS',
    serviceType: 'Express Mail',
    labelSize: '4X6',
    printFormat: 'PDF',
    isDefault: false,
  },
  {
    id: 'lbl_003',
    carrier: 'JAPAN_POST',
    serviceType: 'ePacket',
    labelSize: 'LETTER',
    printFormat: 'PDF',
    isDefault: false,
  },
];

// ============================================================
// バリデーションスキーマ
// ============================================================

const listShipmentsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED']).optional(),
  carrier: z.enum(['USPS', 'FEDEX', 'UPS', 'DHL', 'YAMATO', 'SAGAWA', 'JAPAN_POST', 'EMS', 'OTHER']).optional(),
  search: z.string().optional(),
  hasException: z.coerce.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'estimatedDelivery', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createShipmentSchema = z.object({
  orderId: z.string(),
  carrier: z.enum(['USPS', 'FEDEX', 'UPS', 'DHL', 'YAMATO', 'SAGAWA', 'JAPAN_POST', 'EMS', 'OTHER']),
  serviceType: z.string(),
  weight: z.number().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  insuranceAmount: z.number().min(0).optional(),
  signatureRequired: z.boolean().default(false),
});

const updateTrackingSchema = z.object({
  trackingNumber: z.string().optional(),
  carrier: z.enum(['USPS', 'FEDEX', 'UPS', 'DHL', 'YAMATO', 'SAGAWA', 'JAPAN_POST', 'EMS', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED']).optional(),
});

const resolveExceptionSchema = z.object({
  resolution: z.enum(['RESHIP', 'REFUND', 'ADDRESS_CORRECTED', 'RETURN_TO_SENDER', 'OTHER']),
  notes: z.string().optional(),
  newAddress: z.object({
    name: z.string(),
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
});

// ============================================================
// エンドポイント
// ============================================================

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  const dashboard = {
    overview: {
      totalShipments: mockShipments.length,
      pending: mockShipments.filter(s => s.status === 'PENDING').length,
      inTransit: mockShipments.filter(s => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)).length,
      delivered: mockShipments.filter(s => s.status === 'DELIVERED').length,
      exceptions: mockShipments.filter(s => s.status === 'EXCEPTION').length,
    },
    byCarrier: {
      FEDEX: mockShipments.filter(s => s.carrier === 'FEDEX').length,
      EMS: mockShipments.filter(s => s.carrier === 'EMS').length,
      DHL: mockShipments.filter(s => s.carrier === 'DHL').length,
      JAPAN_POST: mockShipments.filter(s => s.carrier === 'JAPAN_POST').length,
      USPS: mockShipments.filter(s => s.carrier === 'USPS').length,
      UPS: mockShipments.filter(s => s.carrier === 'UPS').length,
      OTHER: mockShipments.filter(s => !['FEDEX', 'EMS', 'DHL', 'JAPAN_POST', 'USPS', 'UPS'].includes(s.carrier)).length,
    },
    recentActivity: mockShipments.slice(0, 5).map(s => ({
      id: s.id,
      orderNumber: s.orderNumber,
      itemTitle: s.itemTitle,
      status: s.status,
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
      updatedAt: s.updatedAt,
    })),
    deliveryPerformance: {
      onTime: 85,
      late: 10,
      exceptions: 5,
      averageDeliveryDays: 4.2,
    },
    costs: {
      totalShippingCost: mockShipments.reduce((sum, s) => sum + s.shippingCost, 0),
      averageCost: mockShipments.length > 0
        ? mockShipments.reduce((sum, s) => sum + s.shippingCost, 0) / mockShipments.length
        : 0,
      insuranceTotal: mockShipments.reduce((sum, s) => sum + (s.insuranceAmount || 0), 0),
    },
    alerts: [
      { type: 'EXCEPTION', count: mockShipments.filter(s => s.status === 'EXCEPTION').length, message: '配送例外があります' },
      { type: 'PENDING', count: mockShipments.filter(s => s.status === 'PENDING').length, message: 'ラベル未作成の出荷があります' },
    ],
  };

  res.json(dashboard);
});

// 出荷一覧
router.get('/shipments', async (req: Request, res: Response) => {
  const params = listShipmentsSchema.parse(req.query);

  let filtered = [...mockShipments];

  if (params.status) {
    filtered = filtered.filter(s => s.status === params.status);
  }
  if (params.carrier) {
    filtered = filtered.filter(s => s.carrier === params.carrier);
  }
  if (params.hasException) {
    filtered = filtered.filter(s => s.status === 'EXCEPTION');
  }
  if (params.search) {
    const search = params.search.toLowerCase();
    filtered = filtered.filter(s =>
      s.trackingNumber.toLowerCase().includes(search) ||
      s.orderNumber.toLowerCase().includes(search) ||
      s.itemTitle.toLowerCase().includes(search) ||
      s.buyerName.toLowerCase().includes(search)
    );
  }

  // ソート
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (params.sortBy) {
      case 'estimatedDelivery':
        const aDate = a.estimatedDelivery ? new Date(a.estimatedDelivery).getTime() : 0;
        const bDate = b.estimatedDelivery ? new Date(b.estimatedDelivery).getTime() : 0;
        comparison = aDate - bDate;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      default:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return params.sortOrder === 'desc' ? -comparison : comparison;
  });

  const total = filtered.length;
  const start = (params.page - 1) * params.limit;
  const shipments = filtered.slice(start, start + params.limit);

  res.json({
    shipments,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(total / params.limit),
    },
  });
});

// 出荷詳細
router.get('/shipments/:shipmentId', async (req: Request, res: Response) => {
  const { shipmentId } = req.params;
  const shipment = mockShipments.find(s => s.id === shipmentId);

  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  res.json({ shipment });
});

// 出荷作成
router.post('/shipments', async (req: Request, res: Response) => {
  const data = createShipmentSchema.parse(req.body);

  const newShipment: Shipment = {
    id: `ship_${Date.now()}`,
    orderId: data.orderId,
    orderNumber: `EB-2026-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
    listingId: `lst_${Date.now()}`,
    itemTitle: 'New Item',
    buyerName: 'New Buyer',
    buyerAddress: {
      name: 'New Buyer',
      street1: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'US',
    },
    carrier: data.carrier,
    trackingNumber: '',
    status: 'PENDING',
    weight: data.weight,
    dimensions: data.dimensions,
    shippingCost: 0,
    currency: 'USD',
    insuranceAmount: data.insuranceAmount,
    signatureRequired: data.signatureRequired,
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    shipment: newShipment,
  });
});

// 追跡情報更新
router.put('/shipments/:shipmentId/tracking', async (req: Request, res: Response) => {
  const { shipmentId } = req.params;
  const data = updateTrackingSchema.parse(req.body);

  const shipment = mockShipments.find(s => s.id === shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  res.json({
    success: true,
    shipment: {
      ...shipment,
      ...data,
      updatedAt: new Date().toISOString(),
    },
  });
});

// ラベル作成
router.post('/shipments/:shipmentId/create-label', async (req: Request, res: Response) => {
  const { shipmentId } = req.params;
  const { labelConfigId } = req.body;

  const shipment = mockShipments.find(s => s.id === shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  // シミュレート: ラベル作成
  const trackingNumber = `${shipment.carrier.substring(0, 2).toUpperCase()}${Date.now()}`;

  res.json({
    success: true,
    shipment: {
      ...shipment,
      trackingNumber,
      labelUrl: `https://example.com/labels/${shipmentId}.pdf`,
      status: 'LABEL_CREATED' as ShipmentStatus,
      events: [
        ...shipment.events,
        {
          timestamp: new Date().toISOString(),
          status: 'LABEL_CREATED' as ShipmentStatus,
          location: 'Tokyo, Japan',
          description: 'Shipping label created',
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    labelUrl: `https://example.com/labels/${shipmentId}.pdf`,
    trackingNumber,
  });
});

// ラベル再印刷
router.post('/shipments/:shipmentId/reprint-label', async (req: Request, res: Response) => {
  const { shipmentId } = req.params;

  const shipment = mockShipments.find(s => s.id === shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  if (!shipment.labelUrl) {
    return res.status(400).json({ error: 'No label exists for this shipment' });
  }

  res.json({
    success: true,
    labelUrl: shipment.labelUrl,
  });
});

// 追跡情報取得（キャリアAPI経由）
router.get('/shipments/:shipmentId/track', async (req: Request, res: Response) => {
  const { shipmentId } = req.params;

  const shipment = mockShipments.find(s => s.id === shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  res.json({
    shipment,
    trackingUrl: `https://www.${shipment.carrier.toLowerCase()}.com/tracking/${shipment.trackingNumber}`,
    lastUpdated: new Date().toISOString(),
  });
});

// 配送例外解決
router.post('/shipments/:shipmentId/resolve-exception', async (req: Request, res: Response) => {
  const { shipmentId } = req.params;
  const data = resolveExceptionSchema.parse(req.body);

  const shipment = mockShipments.find(s => s.id === shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  if (shipment.status !== 'EXCEPTION') {
    return res.status(400).json({ error: 'Shipment is not in exception status' });
  }

  res.json({
    success: true,
    message: `Exception resolved with: ${data.resolution}`,
    shipment: {
      ...shipment,
      status: data.resolution === 'ADDRESS_CORRECTED' ? 'IN_TRANSIT' :
              data.resolution === 'RETURN_TO_SENDER' ? 'RETURNED' :
              data.resolution === 'RESHIP' ? 'PENDING' : shipment.status,
      exception: undefined,
      events: [
        ...shipment.events,
        {
          timestamp: new Date().toISOString(),
          status: 'IN_TRANSIT' as ShipmentStatus,
          location: 'System',
          description: `Exception resolved: ${data.resolution}`,
        },
      ],
      updatedAt: new Date().toISOString(),
    },
  });
});

// 一括ラベル作成
router.post('/shipments/bulk-create-labels', async (req: Request, res: Response) => {
  const { shipmentIds, labelConfigId } = req.body;

  if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    return res.status(400).json({ error: 'Shipment IDs are required' });
  }

  const job: BulkShipmentJob = {
    id: `job_${Date.now()}`,
    status: 'PROCESSING',
    totalCount: shipmentIds.length,
    completedCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    job,
    message: `Processing ${shipmentIds.length} shipments`,
  });
});

// 一括追跡更新
router.post('/shipments/bulk-track', async (req: Request, res: Response) => {
  const { shipmentIds } = req.body;

  if (!shipmentIds || !Array.isArray(shipmentIds)) {
    // 全ての出荷を更新
    const inTransit = mockShipments.filter(s =>
      ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)
    );

    res.json({
      success: true,
      updated: inTransit.length,
      results: inTransit.map(s => ({
        shipmentId: s.id,
        status: s.status,
        updated: true,
      })),
    });
  } else {
    res.json({
      success: true,
      updated: shipmentIds.length,
      results: shipmentIds.map(id => ({
        shipmentId: id,
        updated: true,
      })),
    });
  }
});

// ラベル設定一覧
router.get('/label-configs', async (_req: Request, res: Response) => {
  res.json({
    configs: mockLabelConfigs,
    total: mockLabelConfigs.length,
  });
});

// ラベル設定作成
router.post('/label-configs', async (req: Request, res: Response) => {
  const { carrier, serviceType, labelSize, printFormat, isDefault } = req.body;

  const newConfig: LabelConfig = {
    id: `lbl_${Date.now()}`,
    carrier,
    serviceType,
    labelSize,
    printFormat,
    isDefault: isDefault || false,
  };

  res.status(201).json({
    success: true,
    config: newConfig,
  });
});

// ラベル設定更新
router.put('/label-configs/:configId', async (req: Request, res: Response) => {
  const { configId } = req.params;
  const data = req.body;

  const config = mockLabelConfigs.find(c => c.id === configId);
  if (!config) {
    return res.status(404).json({ error: 'Label config not found' });
  }

  res.json({
    success: true,
    config: {
      ...config,
      ...data,
    },
  });
});

// ラベル設定削除
router.delete('/label-configs/:configId', async (req: Request, res: Response) => {
  const { configId } = req.params;

  const config = mockLabelConfigs.find(c => c.id === configId);
  if (!config) {
    return res.status(404).json({ error: 'Label config not found' });
  }

  res.json({
    success: true,
    message: 'Label config deleted successfully',
  });
});

// 統計情報
router.get('/stats', async (req: Request, res: Response) => {
  const { period = '30d' } = req.query;

  const stats = {
    period,
    shipments: {
      total: mockShipments.length,
      pending: mockShipments.filter(s => s.status === 'PENDING').length,
      inTransit: mockShipments.filter(s => ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)).length,
      delivered: mockShipments.filter(s => s.status === 'DELIVERED').length,
      exceptions: mockShipments.filter(s => s.status === 'EXCEPTION').length,
      returned: mockShipments.filter(s => s.status === 'RETURNED').length,
    },
    delivery: {
      onTimeRate: 85,
      averageDeliveryDays: 4.2,
      fastestDelivery: 2,
      slowestDelivery: 10,
    },
    costs: {
      totalCost: mockShipments.reduce((sum, s) => sum + s.shippingCost, 0),
      averageCost: mockShipments.length > 0
        ? mockShipments.reduce((sum, s) => sum + s.shippingCost, 0) / mockShipments.length
        : 0,
      byCarrier: {
        FEDEX: 24.99,
        EMS: 32.50,
        DHL: 65.00,
        JAPAN_POST: 18.00,
        USPS: 15.99,
      },
    },
    exceptions: {
      total: mockShipments.filter(s => s.status === 'EXCEPTION').length,
      byType: {
        ADDRESS_ISSUE: 1,
        CUSTOMS_DELAY: 0,
        WEATHER_DELAY: 0,
        DAMAGED: 0,
        LOST: 0,
        REFUSED: 0,
      },
    },
  };

  res.json(stats);
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  const settings = {
    defaultCarrier: 'FEDEX',
    autoTrackingUpdate: true,
    trackingUpdateInterval: 4, // 時間
    notifications: {
      shipmentCreated: true,
      labelCreated: true,
      inTransit: false,
      outForDelivery: true,
      delivered: true,
      exception: true,
    },
    labelDefaults: {
      size: '4X6',
      format: 'PDF',
      includeReturnLabel: false,
    },
    insurance: {
      autoInsure: true,
      minValue: 100, // $100以上の商品に保険
      defaultPercentage: 110, // 商品価格の110%
    },
  };

  res.json(settings);
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  const data = req.body;

  res.json({
    success: true,
    message: 'Settings updated successfully',
    settings: data,
  });
});

export { router as ebayShipmentTrackingRouter };
