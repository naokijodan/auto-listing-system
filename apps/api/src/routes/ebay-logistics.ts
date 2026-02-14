/**
 * eBayクロスボーダー物流API
 * Phase 127: 国際配送最適化、キャリア比較、関税計算
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';

const router = Router();

// 配送キャリア
const SHIPPING_CARRIERS = [
  { id: 'dhl', name: 'DHL Express', type: 'EXPRESS', avgDays: '3-5', trackingUrl: 'https://www.dhl.com/track?trackingNumber=' },
  { id: 'fedex', name: 'FedEx International', type: 'EXPRESS', avgDays: '3-5', trackingUrl: 'https://www.fedex.com/tracking?tracknumbers=' },
  { id: 'ups', name: 'UPS Worldwide', type: 'EXPRESS', avgDays: '3-5', trackingUrl: 'https://www.ups.com/track?tracknum=' },
  { id: 'ems', name: 'EMS (Japan Post)', type: 'STANDARD', avgDays: '5-10', trackingUrl: 'https://trackings.post.japanpost.jp/services/srv/search?trackingNumber=' },
  { id: 'epacket', name: 'ePacket', type: 'ECONOMY', avgDays: '7-14', trackingUrl: 'https://trackings.post.japanpost.jp/services/srv/search?trackingNumber=' },
  { id: 'sal', name: 'SAL (Economy Air)', type: 'ECONOMY', avgDays: '10-20', trackingUrl: 'https://trackings.post.japanpost.jp/services/srv/search?trackingNumber=' },
  { id: 'surface', name: 'Surface Mail', type: 'ECONOMY', avgDays: '30-60', trackingUrl: null },
];

// 配送ゾーン
const SHIPPING_ZONES = [
  { zone: 1, name: 'アジア近隣', countries: ['KR', 'TW', 'HK', 'CN'], multiplier: 1.0 },
  { zone: 2, name: 'アジア', countries: ['SG', 'TH', 'MY', 'PH', 'ID', 'VN'], multiplier: 1.2 },
  { zone: 3, name: 'オセアニア', countries: ['AU', 'NZ'], multiplier: 1.3 },
  { zone: 4, name: '北米', countries: ['US', 'CA'], multiplier: 1.4 },
  { zone: 5, name: '欧州（西）', countries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'], multiplier: 1.5 },
  { zone: 6, name: '欧州（東）', countries: ['PL', 'CZ', 'HU', 'RO'], multiplier: 1.6 },
  { zone: 7, name: '中東', countries: ['AE', 'SA', 'IL'], multiplier: 1.7 },
  { zone: 8, name: '南米', countries: ['BR', 'MX', 'AR', 'CL'], multiplier: 1.8 },
  { zone: 9, name: 'アフリカ', countries: ['ZA', 'EG', 'NG'], multiplier: 2.0 },
];

// 重量区分料金（基本料金：円）
const WEIGHT_RATES = {
  dhl: [
    { maxWeight: 0.5, baseRate: 2500 },
    { maxWeight: 1, baseRate: 3500 },
    { maxWeight: 2, baseRate: 5000 },
    { maxWeight: 5, baseRate: 8000 },
    { maxWeight: 10, baseRate: 12000 },
    { maxWeight: 20, baseRate: 20000 },
    { maxWeight: 30, baseRate: 30000 },
  ],
  fedex: [
    { maxWeight: 0.5, baseRate: 2800 },
    { maxWeight: 1, baseRate: 3800 },
    { maxWeight: 2, baseRate: 5500 },
    { maxWeight: 5, baseRate: 8500 },
    { maxWeight: 10, baseRate: 13000 },
    { maxWeight: 20, baseRate: 22000 },
    { maxWeight: 30, baseRate: 32000 },
  ],
  ups: [
    { maxWeight: 0.5, baseRate: 2600 },
    { maxWeight: 1, baseRate: 3600 },
    { maxWeight: 2, baseRate: 5200 },
    { maxWeight: 5, baseRate: 8200 },
    { maxWeight: 10, baseRate: 12500 },
    { maxWeight: 20, baseRate: 21000 },
    { maxWeight: 30, baseRate: 31000 },
  ],
  ems: [
    { maxWeight: 0.5, baseRate: 1400 },
    { maxWeight: 1, baseRate: 2000 },
    { maxWeight: 2, baseRate: 2900 },
    { maxWeight: 5, baseRate: 5000 },
    { maxWeight: 10, baseRate: 8500 },
    { maxWeight: 20, baseRate: 15000 },
    { maxWeight: 30, baseRate: 22000 },
  ],
  epacket: [
    { maxWeight: 0.5, baseRate: 800 },
    { maxWeight: 1, baseRate: 1200 },
    { maxWeight: 2, baseRate: 1800 },
  ],
  sal: [
    { maxWeight: 0.5, baseRate: 600 },
    { maxWeight: 1, baseRate: 900 },
    { maxWeight: 2, baseRate: 1400 },
    { maxWeight: 5, baseRate: 2500 },
    { maxWeight: 10, baseRate: 4000 },
    { maxWeight: 20, baseRate: 7000 },
  ],
  surface: [
    { maxWeight: 0.5, baseRate: 400 },
    { maxWeight: 1, baseRate: 600 },
    { maxWeight: 2, baseRate: 1000 },
    { maxWeight: 5, baseRate: 1800 },
    { maxWeight: 10, baseRate: 3000 },
    { maxWeight: 20, baseRate: 5000 },
  ],
};

// 関税率（商品カテゴリ別、目安）
const DUTY_RATES: Record<string, Record<string, number>> = {
  US: { electronics: 0, clothing: 12, watches: 6.4, jewelry: 6.5, toys: 0, other: 5 },
  GB: { electronics: 0, clothing: 12, watches: 4.5, jewelry: 2.5, toys: 0, other: 5 },
  DE: { electronics: 0, clothing: 12, watches: 4.5, jewelry: 2.5, toys: 0, other: 5 },
  AU: { electronics: 0, clothing: 10, watches: 5, jewelry: 5, toys: 0, other: 5 },
  CA: { electronics: 0, clothing: 18, watches: 5, jewelry: 8.5, toys: 0, other: 5 },
};

// 免税限度額（USD）
const DUTY_THRESHOLDS: Record<string, number> = {
  US: 800,
  GB: 135,
  DE: 150,
  AU: 1000,
  CA: 20,
  default: 50,
};

// ダッシュボード
router.get('/dashboard', async (req, res) => {
  try {
    // 出荷データ取得（サンプル）
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['SHIPPED', 'DELIVERED'] },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        shippingAddress: true,
        shippingCost: true,
        metadata: true,
        createdAt: true,
      },
    });

    // 国別統計
    const countryStats: Record<string, { count: number; totalCost: number }> = {};
    orders.forEach((order: any) => {
      const country = order.shippingAddress?.country || 'UNKNOWN';
      if (!countryStats[country]) {
        countryStats[country] = { count: 0, totalCost: 0 };
      }
      countryStats[country].count++;
      countryStats[country].totalCost += order.shippingCost || 0;
    });

    // キャリア別統計
    const carrierStats: Record<string, { count: number; totalCost: number }> = {};
    orders.forEach((order: any) => {
      const carrier = order.metadata?.shippingCarrier || 'UNKNOWN';
      if (!carrierStats[carrier]) {
        carrierStats[carrier] = { count: 0, totalCost: 0 };
      }
      carrierStats[carrier].count++;
      carrierStats[carrier].totalCost += order.shippingCost || 0;
    });

    // 総統計
    const totalOrders = orders.length;
    const totalShippingCost = orders.reduce((sum, o) => sum + (o.shippingCost || 0), 0);
    const avgShippingCost = totalOrders > 0 ? totalShippingCost / totalOrders : 0;

    // 上位配送先
    const topDestinations = Object.entries(countryStats)
      .map(([country, stats]) => ({
        country,
        ...stats,
        avgCost: stats.count > 0 ? stats.totalCost / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      stats: {
        totalOrders,
        totalShippingCost: totalShippingCost.toFixed(2),
        avgShippingCost: avgShippingCost.toFixed(2),
        activeCarriers: Object.keys(carrierStats).length,
        topDestinationCountry: topDestinations[0]?.country || 'N/A',
      },
      topDestinations,
      carrierStats: Object.entries(carrierStats)
        .map(([carrier, stats]) => ({
          carrier,
          name: SHIPPING_CARRIERS.find(c => c.id === carrier)?.name || carrier,
          ...stats,
          avgCost: stats.count > 0 ? (stats.totalCost / stats.count).toFixed(2) : '0',
        }))
        .sort((a, b) => b.count - a.count),
      carriers: SHIPPING_CARRIERS,
      zones: SHIPPING_ZONES,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// キャリア一覧
router.get('/carriers', async (req, res) => {
  res.json({ carriers: SHIPPING_CARRIERS });
});

// 配送ゾーン一覧
router.get('/zones', async (req, res) => {
  res.json({ zones: SHIPPING_ZONES });
});

// 配送料金計算スキーマ
const calculateRateSchema = z.object({
  weight: z.number().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  destinationCountry: z.string().length(2),
  productCategory: z.string().optional(),
  productValue: z.number().positive().optional(),
});

// 配送料金計算
router.post('/calculate-rate', async (req, res) => {
  try {
    const data = calculateRateSchema.parse(req.body);

    // 容積重量計算（該当する場合）
    let effectiveWeight = data.weight;
    if (data.dimensions) {
      const volumetricWeight = (data.dimensions.length * data.dimensions.width * data.dimensions.height) / 5000;
      effectiveWeight = Math.max(data.weight, volumetricWeight);
    }

    // ゾーン特定
    const zone = SHIPPING_ZONES.find(z => z.countries.includes(data.destinationCountry)) || SHIPPING_ZONES[SHIPPING_ZONES.length - 1];

    // 各キャリアの料金計算
    const rates = SHIPPING_CARRIERS.map(carrier => {
      const carrierRates = WEIGHT_RATES[carrier.id as keyof typeof WEIGHT_RATES];
      if (!carrierRates) return null;

      // 重量区分を特定
      const weightRate = carrierRates.find(r => effectiveWeight <= r.maxWeight);
      if (!weightRate) {
        // 最大重量超過
        const maxRate = carrierRates[carrierRates.length - 1];
        if (effectiveWeight > maxRate.maxWeight) return null;
      }

      const baseRate = weightRate?.baseRate || carrierRates[carrierRates.length - 1].baseRate;
      const finalRate = Math.round(baseRate * zone.multiplier);

      // USD換算（レート: 1 USD = 150 JPY）
      const rateUSD = (finalRate / 150).toFixed(2);

      return {
        carrierId: carrier.id,
        carrierName: carrier.name,
        type: carrier.type,
        estimatedDays: carrier.avgDays,
        rateJPY: finalRate,
        rateUSD: parseFloat(rateUSD),
        hasTracking: carrier.trackingUrl !== null,
      };
    }).filter(Boolean);

    // 料金でソート
    rates.sort((a, b) => (a?.rateJPY || 0) - (b?.rateJPY || 0));

    // 関税計算
    let dutyEstimate = null;
    if (data.productValue && data.productCategory) {
      dutyEstimate = calculateDuty(
        data.destinationCountry,
        data.productValue,
        data.productCategory
      );
    }

    res.json({
      input: {
        actualWeight: data.weight,
        effectiveWeight: Math.round(effectiveWeight * 100) / 100,
        destination: data.destinationCountry,
        zone: zone.name,
      },
      rates,
      cheapest: rates[0],
      fastest: rates.find(r => r?.type === 'EXPRESS') || rates[0],
      dutyEstimate,
      recommendations: generateShippingRecommendations(rates, data.productValue || 0),
    });
  } catch (error) {
    console.error('Calculate rate error:', error);
    res.status(500).json({ error: 'Failed to calculate rate' });
  }
});

// 一括料金計算スキーマ
const bulkCalculateSchema = z.object({
  items: z.array(z.object({
    listingId: z.string(),
    weight: z.number().positive(),
    destinationCountry: z.string().length(2),
  })),
});

// 一括配送料金計算
router.post('/bulk-calculate', async (req, res) => {
  try {
    const data = bulkCalculateSchema.parse(req.body);

    const results = data.items.map(item => {
      const zone = SHIPPING_ZONES.find(z => z.countries.includes(item.destinationCountry)) || SHIPPING_ZONES[SHIPPING_ZONES.length - 1];

      const rates = SHIPPING_CARRIERS.map(carrier => {
        const carrierRates = WEIGHT_RATES[carrier.id as keyof typeof WEIGHT_RATES];
        if (!carrierRates) return null;

        const weightRate = carrierRates.find(r => item.weight <= r.maxWeight);
        if (!weightRate) return null;

        const finalRate = Math.round(weightRate.baseRate * zone.multiplier);
        return {
          carrierId: carrier.id,
          rateJPY: finalRate,
          rateUSD: parseFloat((finalRate / 150).toFixed(2)),
        };
      }).filter(Boolean);

      return {
        listingId: item.listingId,
        destination: item.destinationCountry,
        zone: zone.name,
        cheapestRate: rates.sort((a, b) => (a?.rateJPY || 0) - (b?.rateJPY || 0))[0],
      };
    });

    res.json({
      results,
      summary: {
        totalItems: results.length,
        avgCheapestRate: results.length > 0
          ? (results.reduce((sum, r) => sum + (r.cheapestRate?.rateUSD || 0), 0) / results.length).toFixed(2)
          : '0',
      },
    });
  } catch (error) {
    console.error('Bulk calculate error:', error);
    res.status(500).json({ error: 'Failed to bulk calculate' });
  }
});

// 関税計算スキーマ
const calculateDutySchema = z.object({
  destinationCountry: z.string().length(2),
  productValue: z.number().positive(),
  productCategory: z.string(),
  shippingCost: z.number().optional(),
});

// 関税計算
router.post('/calculate-duty', async (req, res) => {
  try {
    const data = calculateDutySchema.parse(req.body);

    const dutyInfo = calculateDuty(
      data.destinationCountry,
      data.productValue,
      data.productCategory,
      data.shippingCost
    );

    res.json(dutyInfo);
  } catch (error) {
    console.error('Calculate duty error:', error);
    res.status(500).json({ error: 'Failed to calculate duty' });
  }
});

// 配送時間見積もり
router.get('/estimate-delivery', async (req, res) => {
  try {
    const { carrierId, destinationCountry } = req.query;

    if (!carrierId || !destinationCountry) {
      return res.status(400).json({ error: 'carrierId and destinationCountry are required' });
    }

    const carrier = SHIPPING_CARRIERS.find(c => c.id === carrierId);
    if (!carrier) {
      return res.status(404).json({ error: 'Carrier not found' });
    }

    const zone = SHIPPING_ZONES.find(z => z.countries.includes(destinationCountry as string));

    // 配送日数の範囲を解析
    const [minDays, maxDays] = carrier.avgDays.split('-').map(Number);

    // ゾーンに応じて調整
    const zoneAdjustment = zone ? (zone.zone - 1) * 0.5 : 2;
    const adjustedMinDays = Math.round(minDays + zoneAdjustment);
    const adjustedMaxDays = Math.round(maxDays + zoneAdjustment);

    // 予想配達日
    const now = new Date();
    const minDeliveryDate = new Date(now);
    minDeliveryDate.setDate(minDeliveryDate.getDate() + adjustedMinDays);
    const maxDeliveryDate = new Date(now);
    maxDeliveryDate.setDate(maxDeliveryDate.getDate() + adjustedMaxDays);

    res.json({
      carrier: {
        id: carrier.id,
        name: carrier.name,
        type: carrier.type,
      },
      destination: destinationCountry,
      zone: zone?.name || 'その他',
      estimatedDays: `${adjustedMinDays}-${adjustedMaxDays}`,
      estimatedDelivery: {
        earliest: minDeliveryDate.toISOString().split('T')[0],
        latest: maxDeliveryDate.toISOString().split('T')[0],
      },
      hasTracking: carrier.trackingUrl !== null,
      trackingUrlTemplate: carrier.trackingUrl,
    });
  } catch (error) {
    console.error('Estimate delivery error:', error);
    res.status(500).json({ error: 'Failed to estimate delivery' });
  }
});

// 配送ポリシー生成
router.get('/generate-policy', async (req, res) => {
  try {
    const { destinationCountries, carriers } = req.query;

    const countries = destinationCountries ? (destinationCountries as string).split(',') : ['US', 'GB', 'AU'];
    const selectedCarriers = carriers ? (carriers as string).split(',') : ['ems', 'epacket'];

    const carrierInfo = selectedCarriers.map(id => SHIPPING_CARRIERS.find(c => c.id === id)).filter(Boolean);
    const zoneInfo = countries.map(country => {
      const zone = SHIPPING_ZONES.find(z => z.countries.includes(country));
      return { country, zone: zone?.name || 'その他' };
    });

    const policy = `
SHIPPING POLICY

We ship to the following countries:
${zoneInfo.map(z => `- ${z.country} (${z.zone})`).join('\n')}

Available Shipping Methods:
${carrierInfo.map(c => `- ${c?.name}: ${c?.avgDays} business days`).join('\n')}

Important Notes:
- Orders are processed within 1-2 business days
- Tracking information will be provided for all shipments
- Customs duties and taxes may apply depending on your country's regulations
- Delivery times may vary due to customs processing
- We are not responsible for delays caused by customs

Returns:
- Items can be returned within 30 days of delivery
- Buyer is responsible for return shipping costs
- Items must be in original condition

Contact us if you have any questions about shipping to your location.
    `.trim();

    res.json({
      policy,
      countries: zoneInfo,
      carriers: carrierInfo,
    });
  } catch (error) {
    console.error('Generate policy error:', error);
    res.status(500).json({ error: 'Failed to generate policy' });
  }
});

// 配送最適化提案
router.get('/optimization-suggestions', async (req, res) => {
  try {
    // 過去の配送データを分析（サンプル）
    const suggestions = [
      {
        id: 'combine_shipments',
        title: '発送のまとめ',
        description: '同一バイヤーへの複数注文をまとめて発送することで送料を削減できます',
        potentialSaving: '15-20%',
        effort: 'LOW',
        priority: 'HIGH',
      },
      {
        id: 'negotiate_rates',
        title: 'キャリアとの料金交渉',
        description: '月間出荷量が増えている場合、キャリアと料金交渉が可能です',
        potentialSaving: '10-15%',
        effort: 'MEDIUM',
        priority: 'MEDIUM',
      },
      {
        id: 'packaging_optimization',
        title: '梱包サイズの最適化',
        description: '容積重量を減らすため、商品に合った小さな梱包材を使用してください',
        potentialSaving: '5-10%',
        effort: 'LOW',
        priority: 'HIGH',
      },
      {
        id: 'zone_skipping',
        title: 'ゾーンスキッピング',
        description: '大量発送の場合、地域ハブへの一括発送で料金を削減できます',
        potentialSaving: '20-30%',
        effort: 'HIGH',
        priority: 'LOW',
      },
      {
        id: 'carrier_diversification',
        title: 'キャリアの多様化',
        description: '配送先に応じて最適なキャリアを選択してコストを最適化',
        potentialSaving: '10-15%',
        effort: 'LOW',
        priority: 'MEDIUM',
      },
    ];

    res.json({
      suggestions,
      summary: {
        totalPotentialSaving: '15-25%',
        quickWins: suggestions.filter(s => s.effort === 'LOW' && s.priority === 'HIGH'),
      },
    });
  } catch (error) {
    console.error('Optimization suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// 追跡情報取得（モック）
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { carrierId } = req.query;

    // モックデータ
    const events = [
      { date: '2026-02-14T10:00:00Z', status: 'SHIPPED', location: 'Tokyo, Japan', description: '発送完了' },
      { date: '2026-02-14T15:00:00Z', status: 'IN_TRANSIT', location: 'Narita Airport', description: '国際便に搭載' },
      { date: '2026-02-15T08:00:00Z', status: 'IN_TRANSIT', location: 'Los Angeles, USA', description: '到着・通関中' },
      { date: '2026-02-15T14:00:00Z', status: 'CUSTOMS_CLEARED', location: 'Los Angeles, USA', description: '通関完了' },
      { date: '2026-02-16T09:00:00Z', status: 'OUT_FOR_DELIVERY', location: 'Local Hub', description: '配達中' },
    ];

    const carrier = SHIPPING_CARRIERS.find(c => c.id === carrierId) || SHIPPING_CARRIERS[0];

    res.json({
      trackingNumber,
      carrier: carrier.name,
      currentStatus: events[events.length - 1].status,
      estimatedDelivery: '2026-02-16',
      events,
      trackingUrl: carrier.trackingUrl ? `${carrier.trackingUrl}${trackingNumber}` : null,
    });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ error: 'Failed to track shipment' });
  }
});

// 統計
router.get('/stats', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // モック統計データ
    const stats = {
      period: days,
      totalShipments: 150,
      totalShippingCost: 45000,
      avgShippingCost: 300,
      byCarrier: [
        { carrier: 'EMS', count: 80, totalCost: 24000, avgCost: 300 },
        { carrier: 'ePacket', count: 50, totalCost: 12500, avgCost: 250 },
        { carrier: 'DHL', count: 20, totalCost: 8500, avgCost: 425 },
      ],
      byDestination: [
        { country: 'US', count: 60, avgDeliveryDays: 7 },
        { country: 'GB', count: 30, avgDeliveryDays: 8 },
        { country: 'AU', count: 25, avgDeliveryDays: 6 },
        { country: 'DE', count: 20, avgDeliveryDays: 9 },
        { country: 'CA', count: 15, avgDeliveryDays: 8 },
      ],
      deliveryPerformance: {
        onTime: 140,
        delayed: 10,
        onTimeRate: '93.3%',
      },
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ヘルパー関数

function calculateDuty(
  country: string,
  productValue: number,
  category: string,
  shippingCost: number = 0
): {
  country: string;
  productValue: number;
  dutyRate: number;
  estimatedDuty: number;
  threshold: number;
  isDutyFree: boolean;
  totalLandedCost: number;
  notes: string[];
} {
  const threshold = DUTY_THRESHOLDS[country] || DUTY_THRESHOLDS.default;
  const countryRates = DUTY_RATES[country] || {};
  const dutyRate = countryRates[category] || countryRates.other || 5;

  const totalValue = productValue + shippingCost;
  const isDutyFree = totalValue <= threshold;
  const estimatedDuty = isDutyFree ? 0 : Math.round(productValue * (dutyRate / 100) * 100) / 100;

  // VAT/GST（簡易計算）
  let vatRate = 0;
  if (country === 'GB') vatRate = 20;
  else if (country === 'DE') vatRate = 19;
  else if (country === 'AU') vatRate = 10;
  else if (country === 'CA') vatRate = 5;

  const estimatedVAT = isDutyFree ? 0 : Math.round((productValue + estimatedDuty) * (vatRate / 100) * 100) / 100;
  const totalLandedCost = productValue + shippingCost + estimatedDuty + estimatedVAT;

  const notes: string[] = [];
  if (isDutyFree) {
    notes.push(`${threshold} USD以下のため免税`);
  } else {
    notes.push(`関税: ${dutyRate}%`);
    if (vatRate > 0) notes.push(`VAT/GST: ${vatRate}%`);
  }

  return {
    country,
    productValue,
    dutyRate,
    estimatedDuty,
    threshold,
    isDutyFree,
    totalLandedCost: Math.round(totalLandedCost * 100) / 100,
    notes,
  };
}

function generateShippingRecommendations(rates: any[], productValue: number): string[] {
  const recommendations: string[] = [];

  if (rates.length > 1) {
    const cheapest = rates[0];
    const fastest = rates.find(r => r.type === 'EXPRESS');

    if (cheapest && fastest && cheapest.carrierId !== fastest.carrierId) {
      const savings = fastest.rateUSD - cheapest.rateUSD;
      recommendations.push(
        `最安: ${cheapest.carrierName} ($${cheapest.rateUSD}) - エコノミー配送で$${savings.toFixed(2)}節約`
      );
      recommendations.push(
        `最速: ${fastest.carrierName} ($${fastest.rateUSD}) - ${fastest.estimatedDays}日で到着`
      );
    }
  }

  if (productValue > 100) {
    recommendations.push('高額商品: 追跡付きのExpressサービスをお勧めします');
  }

  if (productValue < 50) {
    recommendations.push('低額商品: エコノミー配送でコストを抑えられます');
  }

  return recommendations;
}

export { router as ebayLogisticsRouter };
