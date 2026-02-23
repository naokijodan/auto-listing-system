/**
 * レポート生成エンジン
 * Phase 65: PDF/Excel出力、データ収集、テンプレートレンダリング
 */

import { prisma, ReportType, ReportFormat, ReportStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Writable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

const log = logger.child({ module: 'report-generator' });

// レポートデータの型定義
export interface SalesSummaryData {
  period: { start: Date; end: Date };
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  totalItems: number;
  avgOrderValue: number;
  profitMargin: number;
  byMarketplace: {
    marketplace: string;
    revenue: number;
    orders: number;
    profit: number;
  }[];
  byCategory: {
    category: string;
    revenue: number;
    orders: number;
  }[];
  dailyTrend: {
    date: string;
    revenue: number;
    orders: number;
    profit: number;
  }[];
}

export interface OrderDetailData {
  period: { start: Date; end: Date };
  orders: {
    orderId: string;
    orderNumber: string;
    marketplace: string;
    buyerName: string;
    productTitle: string;
    quantity: number;
    price: number;
    status: string;
    orderDate: Date;
    shippedAt?: Date;
    trackingNumber?: string;
  }[];
  totalCount: number;
}

export interface InventoryStatusData {
  period: { start: Date; end: Date };
  totalProducts: number;
  availableProducts: number;
  soldProducts: number;
  draftProducts: number;
  lowStockAlerts: number;
  byStatus: {
    status: string;
    count: number;
  }[];
  bySource: {
    source: string;
    count: number;
  }[];
  topProducts: {
    title: string;
    sku?: string;
    source: string;
    status: string;
    price: number;
    createdAt: Date;
  }[];
}

export interface ProductPerformanceData {
  period: { start: Date; end: Date };
  products: {
    productId: string;
    title: string;
    totalSales: number;
    revenue: number;
    profit: number;
    avgPrice: number;
    listingCount: number;
    conversionRate: number;
  }[];
  topSellers: {
    title: string;
    sales: number;
    revenue: number;
  }[];
  slowMovers: {
    title: string;
    daysListed: number;
    views: number;
  }[];
}

export interface ProfitAnalysisData {
  period: { start: Date; end: Date };
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  byMarketplace: {
    marketplace: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  byCategory: {
    category: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  monthlyTrend: {
    month: string;
    revenue: number;
    profit: number;
    margin: number;
  }[];
}

export interface CustomerAnalysisData {
  period: { start: Date; end: Date };
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  avgOrdersPerCustomer: number;
  avgRevenuePerCustomer: number;
  topCustomerCountries: {
    country: string;
    count: number;
  }[];
  orderFrequency: {
    bucket: string;
    count: number;
  }[];
}

export interface MarketplaceComparisonData {
  period: { start: Date; end: Date };
  marketplaces: {
    name: string;
    totalListings: number;
    activeListings: number;
    soldListings: number;
    revenue: number;
    avgPrice: number;
    conversionRate: number;
  }[];
  comparison: {
    metric: string;
    joom: number;
    ebay: number;
    winner: string;
  }[];
}

// データ収集関数
export async function collectSalesSummaryData(
  startDate: Date,
  endDate: Date
): Promise<SalesSummaryData> {
  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: startDate, lte: endDate },
    },
    include: {
      sales: {
        include: {
          listing: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalProfit = orders.reduce((sum, o) => {
    const cost = o.sales[0]?.listing?.product?.price || 0;
    return sum + ((o.total || 0) - cost);
  }, 0);

  // マーケットプレイス別集計
  const byMarketplace = Object.values(
    orders.reduce((acc, o) => {
      const mp = o.marketplace || 'unknown';
      if (!acc[mp]) {
        acc[mp] = { marketplace: mp, revenue: 0, orders: 0, profit: 0 };
      }
      acc[mp].revenue += o.total || 0;
      acc[mp].orders += 1;
      const cost = o.sales[0]?.listing?.product?.price || 0;
      acc[mp].profit += (o.total || 0) - cost;
      return acc;
    }, {} as Record<string, { marketplace: string; revenue: number; orders: number; profit: number }>)
  );

  // カテゴリ別集計
  const byCategory = Object.values(
    orders.reduce((acc, o) => {
      const cat = o.sales[0]?.listing?.product?.category || 'その他';
      if (!acc[cat]) {
        acc[cat] = { category: cat, revenue: 0, orders: 0 };
      }
      acc[cat].revenue += o.total || 0;
      acc[cat].orders += 1;
      return acc;
    }, {} as Record<string, { category: string; revenue: number; orders: number }>)
  );

  // 日別トレンド
  const dailyMap = orders.reduce((acc, o) => {
    const date = o.orderedAt.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, orders: 0, profit: 0 };
    }
    acc[date].revenue += o.total || 0;
    acc[date].orders += 1;
    const cost = o.sales[0]?.listing?.product?.price || 0;
    acc[date].profit += (o.total || 0) - cost;
    return acc;
  }, {} as Record<string, { date: string; revenue: number; orders: number; profit: number }>);

  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: { start: startDate, end: endDate },
    totalRevenue,
    totalProfit,
    totalOrders: orders.length,
    totalItems: orders.reduce((sum, o) => sum + (o.sales.reduce((s, sale) => s + (sale.quantity || 1), 0)), 0),
    avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    byMarketplace,
    byCategory,
    dailyTrend,
  };
}

export async function collectOrderDetailData(
  startDate: Date,
  endDate: Date
): Promise<OrderDetailData> {
  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: startDate, lte: endDate },
    },
    include: {
      sales: {
        include: {
          listing: {
            include: {
              product: true,
            },
          },
        },
      },
    },
    orderBy: { orderedAt: 'desc' },
  });

  return {
    period: { start: startDate, end: endDate },
    orders: orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.marketplaceOrderId || o.id,
      marketplace: o.marketplace || 'unknown',
      buyerName: o.buyerName || 'Unknown',
      productTitle: o.sales[0]?.listing?.product?.title || 'Unknown Product',
      quantity: o.sales.reduce((sum, s) => sum + (s.quantity || 1), 0),
      price: o.total || 0,
      status: o.status,
      orderDate: o.orderedAt,
      shippedAt: o.shippedAt || undefined,
      trackingNumber: o.trackingNumber || undefined,
    })),
    totalCount: orders.length,
  };
}

export async function collectInventoryStatusData(
  startDate: Date,
  endDate: Date
): Promise<InventoryStatusData> {
  const products = await prisma.product.findMany({
    where: {
      createdAt: { lte: endDate },
    },
  });

  const byStatus = Object.values(
    products.reduce((acc, p) => {
      const status = p.status || 'UNKNOWN';
      if (!acc[status]) {
        acc[status] = { status, count: 0 };
      }
      acc[status].count += 1;
      return acc;
    }, {} as Record<string, { status: string; count: number }>)
  );

  const bySource = Object.values(
    products.reduce((acc, p) => {
      const source = p.sourceId || 'unknown';
      if (!acc[source]) {
        acc[source] = { source, count: 0 };
      }
      acc[source].count += 1;
      return acc;
    }, {} as Record<string, { source: string; count: number }>)
  );

  const topProducts = products.slice(0, 20).map((p) => ({
    title: p.title,
    sku: p.sourceItemId || undefined,
    source: p.sourceId || 'unknown',
    status: p.status,
    price: p.price || 0,
    createdAt: p.createdAt,
  }));

  return {
    period: { start: startDate, end: endDate },
    totalProducts: products.length,
    availableProducts: products.filter((p) => p.status === 'ACTIVE').length,
    soldProducts: products.filter((p) => p.status === 'SOLD').length,
    draftProducts: products.filter((p) => p.status === 'PENDING_SCRAPE').length,
    lowStockAlerts: 0,
    byStatus,
    bySource,
    topProducts,
  };
}

export async function collectProductPerformanceData(
  startDate: Date,
  endDate: Date
): Promise<ProductPerformanceData> {
  const products = await prisma.product.findMany({
    include: {
      listings: {
        include: {
          sales: {
            where: {
              order: {
                orderedAt: { gte: startDate, lte: endDate },
              },
            },
            include: {
              order: true,
            },
          },
        },
      },
    },
  });

  const performanceData = products.map((p) => {
    const sales = p.listings.flatMap((l) => l.sales);
    const totalSales = sales.reduce((sum, s) => sum + (s.quantity || 1), 0);
    const revenue = sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const profit = revenue - (p.price || 0) * totalSales;

    return {
      productId: p.id,
      title: p.title,
      totalSales,
      revenue,
      profit,
      avgPrice: totalSales > 0 ? revenue / totalSales : 0,
      listingCount: p.listings.length,
      conversionRate: 0,
    };
  });

  const topSellers = performanceData
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 10)
    .map((p) => ({
      title: p.title,
      sales: p.totalSales,
      revenue: p.revenue,
    }));

  return {
    period: { start: startDate, end: endDate },
    products: performanceData,
    topSellers,
    slowMovers: [],
  };
}

export async function collectProfitAnalysisData(
  startDate: Date,
  endDate: Date
): Promise<ProfitAnalysisData> {
  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: startDate, lte: endDate },
    },
    include: {
      sales: {
        include: {
          listing: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCost = orders.reduce((sum, o) => {
    return sum + o.sales.reduce((saleSum, s) => {
      const cost = s.listing?.product?.price || 0;
      const qty = s.quantity || 1;
      return saleSum + cost * qty;
    }, 0);
  }, 0);
  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit * 0.85; // 簡易計算（手数料等考慮）

  const byMarketplace = Object.values(
    orders.reduce((acc, o) => {
      const mp = o.marketplace || 'unknown';
      if (!acc[mp]) {
        acc[mp] = { marketplace: mp, revenue: 0, cost: 0, profit: 0, margin: 0 };
      }
      const cost = o.sales.reduce((saleSum, s) => {
        return saleSum + ((s.listing?.product?.price || 0) * (s.quantity || 1));
      }, 0);
      acc[mp].revenue += o.total || 0;
      acc[mp].cost += cost;
      acc[mp].profit = acc[mp].revenue - acc[mp].cost;
      acc[mp].margin = acc[mp].revenue > 0 ? (acc[mp].profit / acc[mp].revenue) * 100 : 0;
      return acc;
    }, {} as Record<string, { marketplace: string; revenue: number; cost: number; profit: number; margin: number }>)
  );

  return {
    period: { start: startDate, end: endDate },
    totalRevenue,
    totalCost,
    grossProfit,
    netProfit,
    profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
    byMarketplace,
    byCategory: [],
    monthlyTrend: [],
  };
}

export async function collectCustomerAnalysisData(
  startDate: Date,
  endDate: Date
): Promise<CustomerAnalysisData> {
  const orders = await prisma.order.findMany({
    where: {
      orderedAt: { gte: startDate, lte: endDate },
    },
  });

  const customerMap = new Map<string, { orders: number; revenue: number }>();
  orders.forEach((o) => {
    const buyer = o.buyerUsername || o.buyerName || 'unknown';
    const existing = customerMap.get(buyer) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += o.total || 0;
    customerMap.set(buyer, existing);
  });

  const totalCustomers = customerMap.size;
  const customers = Array.from(customerMap.values());
  const repeatCustomers = customers.filter((c) => c.orders > 1).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);

  // 国別集計
  const countryMap = new Map<string, number>();
  orders.forEach((o) => {
    const addr = o.shippingAddress as Record<string, unknown> | null;
    const country = (addr?.country as string) || 'Unknown';
    countryMap.set(country, (countryMap.get(country) || 0) + 1);
  });

  const topCustomerCountries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    period: { start: startDate, end: endDate },
    totalCustomers,
    newCustomers: totalCustomers,
    repeatCustomers,
    avgOrdersPerCustomer: totalCustomers > 0 ? totalOrders / totalCustomers : 0,
    avgRevenuePerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
    topCustomerCountries,
    orderFrequency: [],
  };
}

export async function collectMarketplaceComparisonData(
  startDate: Date,
  endDate: Date
): Promise<MarketplaceComparisonData> {
  const listings = await prisma.listing.findMany({
    include: {
      sales: {
        where: {
          order: {
            orderedAt: { gte: startDate, lte: endDate },
          },
        },
        include: {
          order: true,
        },
      },
    },
  });

  const mpMap = new Map<
    string,
    {
      totalListings: number;
      activeListings: number;
      soldListings: number;
      revenue: number;
      totalPrice: number;
    }
  >();

  listings.forEach((l) => {
    const mp = l.marketplace;
    const existing = mpMap.get(mp) || {
      totalListings: 0,
      activeListings: 0,
      soldListings: 0,
      revenue: 0,
      totalPrice: 0,
    };
    existing.totalListings += 1;
    if (l.status === 'ACTIVE') existing.activeListings += 1;
    if (l.status === 'SOLD') existing.soldListings += 1;
    const saleRevenue = l.sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    existing.revenue += saleRevenue;
    existing.totalPrice += l.listingPrice || 0;
    mpMap.set(mp, existing);
  });

  const marketplaces = Array.from(mpMap.entries()).map(([name, data]) => ({
    name,
    totalListings: data.totalListings,
    activeListings: data.activeListings,
    soldListings: data.soldListings,
    revenue: data.revenue,
    avgPrice: data.totalListings > 0 ? data.totalPrice / data.totalListings : 0,
    conversionRate:
      data.totalListings > 0 ? (data.soldListings / data.totalListings) * 100 : 0,
  }));

  const joom = marketplaces.find((m) => m.name === 'joom') || {
    totalListings: 0,
    revenue: 0,
    conversionRate: 0,
  };
  const ebay = marketplaces.find((m) => m.name === 'ebay') || {
    totalListings: 0,
    revenue: 0,
    conversionRate: 0,
  };

  const comparison = [
    {
      metric: '出品数',
      joom: joom.totalListings,
      ebay: ebay.totalListings,
      winner: joom.totalListings > ebay.totalListings ? 'Joom' : 'eBay',
    },
    {
      metric: '売上',
      joom: joom.revenue,
      ebay: ebay.revenue,
      winner: joom.revenue > ebay.revenue ? 'Joom' : 'eBay',
    },
    {
      metric: 'コンバージョン率',
      joom: joom.conversionRate,
      ebay: ebay.conversionRate,
      winner: joom.conversionRate > ebay.conversionRate ? 'Joom' : 'eBay',
    },
  ];

  return {
    period: { start: startDate, end: endDate },
    marketplaces,
    comparison,
  };
}

// PDF生成関数
export async function generatePdfReport(
  reportType: ReportType,
  data: any,
  outputPath: string
): Promise<{ size: number }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      await fs.promises.writeFile(outputPath, buffer);
      resolve({ size: buffer.length });
    });
    doc.on('error', reject);

    // ヘッダー
    doc.fontSize(24).text('RAKUDA レポート', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(getReportTypeLabel(reportType), { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`生成日時: ${new Date().toLocaleString('ja-JP')}`, { align: 'right' });
    doc.moveDown(2);

    // レポートタイプに応じたコンテンツ
    switch (reportType) {
      case 'SALES_SUMMARY':
        renderSalesSummaryPdf(doc, data as SalesSummaryData);
        break;
      case 'ORDER_DETAIL':
        renderOrderDetailPdf(doc, data as OrderDetailData);
        break;
      case 'INVENTORY_STATUS':
        renderInventoryStatusPdf(doc, data as InventoryStatusData);
        break;
      case 'PRODUCT_PERFORMANCE':
        renderProductPerformancePdf(doc, data as ProductPerformanceData);
        break;
      case 'PROFIT_ANALYSIS':
        renderProfitAnalysisPdf(doc, data as ProfitAnalysisData);
        break;
      case 'CUSTOMER_ANALYSIS':
        renderCustomerAnalysisPdf(doc, data as CustomerAnalysisData);
        break;
      case 'MARKETPLACE_COMPARISON':
        renderMarketplaceComparisonPdf(doc, data as MarketplaceComparisonData);
        break;
      default:
        doc.text('レポートデータなし');
    }

    // フッター
    doc.moveDown(2);
    doc.opacity(0.5);
    doc.fontSize(8).text('Generated by RAKUDA - Cross-border EC Automation System', {
      align: 'center',
    });

    doc.end();
  });
}

function renderSalesSummaryPdf(doc: PDFKit.PDFDocument, data: SalesSummaryData) {
  // サマリーセクション
  doc.fontSize(14).text('サマリー', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`期間: ${data.period.start.toLocaleDateString('ja-JP')} - ${data.period.end.toLocaleDateString('ja-JP')}`);
  doc.text(`総売上: ¥${data.totalRevenue.toLocaleString()}`);
  doc.text(`総利益: ¥${data.totalProfit.toLocaleString()}`);
  doc.text(`注文数: ${data.totalOrders.toLocaleString()}件`);
  doc.text(`販売数: ${data.totalItems.toLocaleString()}点`);
  doc.text(`平均注文額: ¥${data.avgOrderValue.toLocaleString()}`);
  doc.text(`利益率: ${data.profitMargin.toFixed(1)}%`);
  doc.moveDown();

  // マーケットプレイス別
  doc.fontSize(14).text('マーケットプレイス別', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  data.byMarketplace.forEach((mp) => {
    doc.text(`${mp.marketplace}: 売上 ¥${mp.revenue.toLocaleString()} / 注文 ${mp.orders}件 / 利益 ¥${mp.profit.toLocaleString()}`);
  });
}

function renderOrderDetailPdf(doc: PDFKit.PDFDocument, data: OrderDetailData) {
  doc.fontSize(14).text('注文詳細', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`期間: ${data.period.start.toLocaleDateString('ja-JP')} - ${data.period.end.toLocaleDateString('ja-JP')}`);
  doc.text(`総注文数: ${data.totalCount}件`);
  doc.moveDown();

  // テーブルヘッダー
  const startY = doc.y;
  doc.fontSize(9);
  doc.text('注文番号', 50, startY);
  doc.text('マーケット', 150, startY);
  doc.text('商品', 220, startY);
  doc.text('金額', 400, startY);
  doc.text('状態', 460, startY);
  doc.moveDown();

  // 注文リスト（最大30件）
  data.orders.slice(0, 30).forEach((order) => {
    const y = doc.y;
    doc.fontSize(8);
    doc.text(order.orderNumber.substring(0, 15), 50, y);
    doc.text(order.marketplace, 150, y);
    doc.text(order.productTitle.substring(0, 30), 220, y);
    doc.text(`¥${order.price.toLocaleString()}`, 400, y);
    doc.text(order.status, 460, y);
    doc.moveDown(0.5);
  });
}

function renderInventoryStatusPdf(doc: PDFKit.PDFDocument, data: InventoryStatusData) {
  doc.fontSize(14).text('在庫状況', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`総商品数: ${data.totalProducts.toLocaleString()}点`);
  doc.text(`販売可能: ${data.availableProducts.toLocaleString()}点`);
  doc.text(`販売済み: ${data.soldProducts.toLocaleString()}点`);
  doc.text(`下書き: ${data.draftProducts.toLocaleString()}点`);
  doc.moveDown();

  doc.fontSize(14).text('ステータス別', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  data.byStatus.forEach((s) => {
    doc.text(`${s.status}: ${s.count.toLocaleString()}点`);
  });
}

function renderProductPerformancePdf(doc: PDFKit.PDFDocument, data: ProductPerformanceData) {
  doc.fontSize(14).text('商品パフォーマンス', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12).text('売れ筋商品 TOP10', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  data.topSellers.forEach((p, i) => {
    doc.text(`${i + 1}. ${p.title.substring(0, 40)} - 販売数: ${p.sales} / 売上: ¥${p.revenue.toLocaleString()}`);
  });
}

function renderProfitAnalysisPdf(doc: PDFKit.PDFDocument, data: ProfitAnalysisData) {
  doc.fontSize(14).text('利益分析', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`総売上: ¥${data.totalRevenue.toLocaleString()}`);
  doc.text(`総原価: ¥${data.totalCost.toLocaleString()}`);
  doc.text(`粗利益: ¥${data.grossProfit.toLocaleString()}`);
  doc.text(`純利益: ¥${data.netProfit.toLocaleString()}`);
  doc.text(`利益率: ${data.profitMargin.toFixed(1)}%`);
  doc.moveDown();

  doc.fontSize(14).text('マーケットプレイス別', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  data.byMarketplace.forEach((mp) => {
    doc.text(`${mp.marketplace}: 売上 ¥${mp.revenue.toLocaleString()} / 利益 ¥${mp.profit.toLocaleString()} / 利益率 ${mp.margin.toFixed(1)}%`);
  });
}

function renderCustomerAnalysisPdf(doc: PDFKit.PDFDocument, data: CustomerAnalysisData) {
  doc.fontSize(14).text('顧客分析', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`総顧客数: ${data.totalCustomers.toLocaleString()}人`);
  doc.text(`新規顧客: ${data.newCustomers.toLocaleString()}人`);
  doc.text(`リピート顧客: ${data.repeatCustomers.toLocaleString()}人`);
  doc.text(`平均注文数/顧客: ${data.avgOrdersPerCustomer.toFixed(1)}件`);
  doc.text(`平均売上/顧客: ¥${data.avgRevenuePerCustomer.toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(14).text('国別顧客数', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  data.topCustomerCountries.forEach((c) => {
    doc.text(`${c.country}: ${c.count.toLocaleString()}人`);
  });
}

function renderMarketplaceComparisonPdf(doc: PDFKit.PDFDocument, data: MarketplaceComparisonData) {
  doc.fontSize(14).text('マーケットプレイス比較', { underline: true });
  doc.moveDown(0.5);

  data.marketplaces.forEach((mp) => {
    doc.fontSize(12).text(mp.name.toUpperCase(), { underline: true });
    doc.fontSize(10);
    doc.text(`出品数: ${mp.totalListings.toLocaleString()}件`);
    doc.text(`アクティブ: ${mp.activeListings.toLocaleString()}件`);
    doc.text(`販売済み: ${mp.soldListings.toLocaleString()}件`);
    doc.text(`売上: ¥${mp.revenue.toLocaleString()}`);
    doc.text(`平均価格: ¥${mp.avgPrice.toLocaleString()}`);
    doc.text(`コンバージョン率: ${mp.conversionRate.toFixed(1)}%`);
    doc.moveDown();
  });
}

// Excel生成関数
export async function generateExcelReport(
  reportType: ReportType,
  data: any,
  outputPath: string
): Promise<{ size: number }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RAKUDA';
  workbook.created = new Date();

  switch (reportType) {
    case 'SALES_SUMMARY':
      await renderSalesSummaryExcel(workbook, data as SalesSummaryData);
      break;
    case 'ORDER_DETAIL':
      await renderOrderDetailExcel(workbook, data as OrderDetailData);
      break;
    case 'INVENTORY_STATUS':
      await renderInventoryStatusExcel(workbook, data as InventoryStatusData);
      break;
    case 'PRODUCT_PERFORMANCE':
      await renderProductPerformanceExcel(workbook, data as ProductPerformanceData);
      break;
    case 'PROFIT_ANALYSIS':
      await renderProfitAnalysisExcel(workbook, data as ProfitAnalysisData);
      break;
    case 'CUSTOMER_ANALYSIS':
      await renderCustomerAnalysisExcel(workbook, data as CustomerAnalysisData);
      break;
    case 'MARKETPLACE_COMPARISON':
      await renderMarketplaceComparisonExcel(workbook, data as MarketplaceComparisonData);
      break;
    default:
      const sheet = workbook.addWorksheet('データなし');
      sheet.addRow(['レポートデータなし']);
  }

  await workbook.xlsx.writeFile(outputPath);
  const stats = await fs.promises.stat(outputPath);
  return { size: stats.size };
}

async function renderSalesSummaryExcel(workbook: ExcelJS.Workbook, data: SalesSummaryData) {
  // サマリーシート
  const summarySheet = workbook.addWorksheet('サマリー');
  summarySheet.columns = [
    { header: '項目', key: 'item', width: 20 },
    { header: '値', key: 'value', width: 25 },
  ];
  summarySheet.addRow({ item: '期間開始', value: data.period.start.toLocaleDateString('ja-JP') });
  summarySheet.addRow({ item: '期間終了', value: data.period.end.toLocaleDateString('ja-JP') });
  summarySheet.addRow({ item: '総売上', value: data.totalRevenue });
  summarySheet.addRow({ item: '総利益', value: data.totalProfit });
  summarySheet.addRow({ item: '注文数', value: data.totalOrders });
  summarySheet.addRow({ item: '販売数', value: data.totalItems });
  summarySheet.addRow({ item: '平均注文額', value: data.avgOrderValue });
  summarySheet.addRow({ item: '利益率', value: `${data.profitMargin.toFixed(1)}%` });

  // マーケットプレイス別シート
  const mpSheet = workbook.addWorksheet('マーケットプレイス別');
  mpSheet.columns = [
    { header: 'マーケットプレイス', key: 'marketplace', width: 20 },
    { header: '売上', key: 'revenue', width: 15 },
    { header: '注文数', key: 'orders', width: 10 },
    { header: '利益', key: 'profit', width: 15 },
  ];
  data.byMarketplace.forEach((mp) => mpSheet.addRow(mp));

  // 日別トレンドシート
  const trendSheet = workbook.addWorksheet('日別トレンド');
  trendSheet.columns = [
    { header: '日付', key: 'date', width: 15 },
    { header: '売上', key: 'revenue', width: 15 },
    { header: '注文数', key: 'orders', width: 10 },
    { header: '利益', key: 'profit', width: 15 },
  ];
  data.dailyTrend.forEach((d) => trendSheet.addRow(d));
}

async function renderOrderDetailExcel(workbook: ExcelJS.Workbook, data: OrderDetailData) {
  const sheet = workbook.addWorksheet('注文一覧');
  sheet.columns = [
    { header: '注文番号', key: 'orderNumber', width: 20 },
    { header: 'マーケットプレイス', key: 'marketplace', width: 15 },
    { header: '購入者', key: 'buyerName', width: 20 },
    { header: '商品名', key: 'productTitle', width: 40 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '金額', key: 'price', width: 12 },
    { header: 'ステータス', key: 'status', width: 12 },
    { header: '注文日', key: 'orderDate', width: 15 },
    { header: '発送日', key: 'shippedAt', width: 15 },
    { header: '追跡番号', key: 'trackingNumber', width: 20 },
  ];

  data.orders.forEach((order) => {
    sheet.addRow({
      ...order,
      orderDate: order.orderDate.toLocaleDateString('ja-JP'),
      shippedAt: order.shippedAt?.toLocaleDateString('ja-JP') || '',
    });
  });

  // ヘッダースタイル
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };
}

async function renderInventoryStatusExcel(workbook: ExcelJS.Workbook, data: InventoryStatusData) {
  const summarySheet = workbook.addWorksheet('サマリー');
  summarySheet.columns = [
    { header: '項目', key: 'item', width: 20 },
    { header: '値', key: 'value', width: 15 },
  ];
  summarySheet.addRow({ item: '総商品数', value: data.totalProducts });
  summarySheet.addRow({ item: '販売可能', value: data.availableProducts });
  summarySheet.addRow({ item: '販売済み', value: data.soldProducts });
  summarySheet.addRow({ item: '下書き', value: data.draftProducts });

  const statusSheet = workbook.addWorksheet('ステータス別');
  statusSheet.columns = [
    { header: 'ステータス', key: 'status', width: 20 },
    { header: '件数', key: 'count', width: 15 },
  ];
  data.byStatus.forEach((s) => statusSheet.addRow(s));

  const productSheet = workbook.addWorksheet('商品一覧');
  productSheet.columns = [
    { header: '商品名', key: 'title', width: 40 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'ソース', key: 'source', width: 15 },
    { header: 'ステータス', key: 'status', width: 15 },
    { header: '価格', key: 'price', width: 12 },
    { header: '登録日', key: 'createdAt', width: 15 },
  ];
  data.topProducts.forEach((p) => {
    productSheet.addRow({
      ...p,
      createdAt: p.createdAt.toLocaleDateString('ja-JP'),
    });
  });
}

async function renderProductPerformanceExcel(workbook: ExcelJS.Workbook, data: ProductPerformanceData) {
  const sheet = workbook.addWorksheet('商品パフォーマンス');
  sheet.columns = [
    { header: '商品名', key: 'title', width: 40 },
    { header: '販売数', key: 'totalSales', width: 12 },
    { header: '売上', key: 'revenue', width: 15 },
    { header: '利益', key: 'profit', width: 15 },
    { header: '平均価格', key: 'avgPrice', width: 12 },
    { header: '出品数', key: 'listingCount', width: 10 },
  ];
  data.products.forEach((p) => sheet.addRow(p));

  const topSheet = workbook.addWorksheet('売れ筋TOP10');
  topSheet.columns = [
    { header: '順位', key: 'rank', width: 8 },
    { header: '商品名', key: 'title', width: 40 },
    { header: '販売数', key: 'sales', width: 12 },
    { header: '売上', key: 'revenue', width: 15 },
  ];
  data.topSellers.forEach((p, i) => {
    topSheet.addRow({ rank: i + 1, ...p });
  });
}

async function renderProfitAnalysisExcel(workbook: ExcelJS.Workbook, data: ProfitAnalysisData) {
  const sheet = workbook.addWorksheet('利益分析');
  sheet.columns = [
    { header: '項目', key: 'item', width: 20 },
    { header: '金額', key: 'value', width: 20 },
  ];
  sheet.addRow({ item: '総売上', value: data.totalRevenue });
  sheet.addRow({ item: '総原価', value: data.totalCost });
  sheet.addRow({ item: '粗利益', value: data.grossProfit });
  sheet.addRow({ item: '純利益', value: data.netProfit });
  sheet.addRow({ item: '利益率', value: `${data.profitMargin.toFixed(1)}%` });

  const mpSheet = workbook.addWorksheet('マーケットプレイス別');
  mpSheet.columns = [
    { header: 'マーケットプレイス', key: 'marketplace', width: 20 },
    { header: '売上', key: 'revenue', width: 15 },
    { header: '原価', key: 'cost', width: 15 },
    { header: '利益', key: 'profit', width: 15 },
    { header: '利益率', key: 'margin', width: 12 },
  ];
  data.byMarketplace.forEach((mp) => {
    mpSheet.addRow({ ...mp, margin: `${mp.margin.toFixed(1)}%` });
  });
}

async function renderCustomerAnalysisExcel(workbook: ExcelJS.Workbook, data: CustomerAnalysisData) {
  const sheet = workbook.addWorksheet('顧客分析');
  sheet.columns = [
    { header: '項目', key: 'item', width: 25 },
    { header: '値', key: 'value', width: 20 },
  ];
  sheet.addRow({ item: '総顧客数', value: data.totalCustomers });
  sheet.addRow({ item: '新規顧客', value: data.newCustomers });
  sheet.addRow({ item: 'リピート顧客', value: data.repeatCustomers });
  sheet.addRow({ item: '平均注文数/顧客', value: data.avgOrdersPerCustomer.toFixed(1) });
  sheet.addRow({ item: '平均売上/顧客', value: data.avgRevenuePerCustomer.toFixed(0) });

  const countrySheet = workbook.addWorksheet('国別顧客');
  countrySheet.columns = [
    { header: '国', key: 'country', width: 25 },
    { header: '顧客数', key: 'count', width: 15 },
  ];
  data.topCustomerCountries.forEach((c) => countrySheet.addRow(c));
}

async function renderMarketplaceComparisonExcel(workbook: ExcelJS.Workbook, data: MarketplaceComparisonData) {
  const sheet = workbook.addWorksheet('マーケットプレイス比較');
  sheet.columns = [
    { header: 'マーケットプレイス', key: 'name', width: 20 },
    { header: '出品数', key: 'totalListings', width: 12 },
    { header: 'アクティブ', key: 'activeListings', width: 12 },
    { header: '販売済み', key: 'soldListings', width: 12 },
    { header: '売上', key: 'revenue', width: 15 },
    { header: '平均価格', key: 'avgPrice', width: 12 },
    { header: 'コンバージョン率', key: 'conversionRate', width: 15 },
  ];
  data.marketplaces.forEach((mp) => {
    sheet.addRow({ ...mp, conversionRate: `${mp.conversionRate.toFixed(1)}%` });
  });

  const compSheet = workbook.addWorksheet('指標比較');
  compSheet.columns = [
    { header: '指標', key: 'metric', width: 20 },
    { header: 'Joom', key: 'joom', width: 15 },
    { header: 'eBay', key: 'ebay', width: 15 },
    { header: '優位', key: 'winner', width: 10 },
  ];
  data.comparison.forEach((c) => compSheet.addRow(c));
}

// CSV生成関数
export async function generateCsvReport(
  reportType: ReportType,
  data: any,
  outputPath: string
): Promise<{ size: number }> {
  let csvContent = '';

  switch (reportType) {
    case 'SALES_SUMMARY': {
      const salesData = data as SalesSummaryData;
      csvContent = 'マーケットプレイス,売上,注文数,利益\n';
      salesData.byMarketplace.forEach((mp) => {
        csvContent += `${mp.marketplace},${mp.revenue},${mp.orders},${mp.profit}\n`;
      });
      break;
    }
    case 'ORDER_DETAIL': {
      const orderData = data as OrderDetailData;
      csvContent = '注文番号,マーケットプレイス,購入者,商品名,数量,金額,ステータス,注文日\n';
      orderData.orders.forEach((o) => {
        csvContent += `${o.orderNumber},${o.marketplace},${o.buyerName},"${o.productTitle}",${o.quantity},${o.price},${o.status},${o.orderDate.toISOString()}\n`;
      });
      break;
    }
    default:
      csvContent = 'データなし\n';
  }

  await fs.promises.writeFile(outputPath, csvContent, 'utf-8');
  const stats = await fs.promises.stat(outputPath);
  return { size: stats.size };
}

// メインのレポート生成関数
export async function generateReport(
  reportId: string,
  outputDir: string = '/tmp/rakuda-reports'
): Promise<{ filePath: string; fileSize: number; fileName: string }> {
  // レポート情報取得
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error(`Report not found: ${reportId}`);
  }

  log.info({ reportId, reportType: report.reportType, format: report.format }, 'Starting report generation');

  // ステータスを処理中に更新
  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: 'GENERATING',
      startedAt: new Date(),
      progress: 10,
    },
  });

  try {
    // 期間パラメータの解析
    const params = report.parameters as { startDate?: string; endDate?: string } || {};
    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    let startDate: Date;

    switch (report.timeRange) {
      case 'last_7d':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last_30d':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'last_90d':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate = params.startDate ? new Date(params.startDate) : new Date(endDate);
        startDate.setDate(startDate.getDate() - 30);
    }

    // データ収集
    await prisma.report.update({
      where: { id: reportId },
      data: { progress: 30 },
    });

    let reportData: any;
    switch (report.reportType) {
      case 'SALES_SUMMARY':
        reportData = await collectSalesSummaryData(startDate, endDate);
        break;
      case 'ORDER_DETAIL':
        reportData = await collectOrderDetailData(startDate, endDate);
        break;
      case 'INVENTORY_STATUS':
        reportData = await collectInventoryStatusData(startDate, endDate);
        break;
      case 'PRODUCT_PERFORMANCE':
        reportData = await collectProductPerformanceData(startDate, endDate);
        break;
      case 'PROFIT_ANALYSIS':
        reportData = await collectProfitAnalysisData(startDate, endDate);
        break;
      case 'CUSTOMER_ANALYSIS':
        reportData = await collectCustomerAnalysisData(startDate, endDate);
        break;
      case 'MARKETPLACE_COMPARISON':
        reportData = await collectMarketplaceComparisonData(startDate, endDate);
        break;
      default:
        reportData = {};
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { progress: 60 },
    });

    // 出力ディレクトリ作成
    await fs.promises.mkdir(outputDir, { recursive: true });

    // ファイル名生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = getFormatExtension(report.format);
    const fileName = `${report.name.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_')}_${timestamp}${extension}`;
    const filePath = path.join(outputDir, fileName);

    // レポート生成
    let result: { size: number };
    switch (report.format) {
      case 'PDF':
        result = await generatePdfReport(report.reportType, reportData, filePath);
        break;
      case 'EXCEL':
        result = await generateExcelReport(report.reportType, reportData, filePath);
        break;
      case 'CSV':
        result = await generateCsvReport(report.reportType, reportData, filePath);
        break;
      default:
        throw new Error(`Unsupported format: ${report.format}`);
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { progress: 90 },
    });

    // 完了ステータスに更新
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        filePath,
        fileName,
        fileSize: result.size,
        mimeType: getFormatMimeType(report.format),
      },
    });

    log.info({ reportId, filePath, fileSize: result.size }, 'Report generation completed');

    return { filePath, fileSize: result.size, fileName };
  } catch (error) {
    log.error({ reportId, error }, 'Report generation failed');

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

// ヘルパー関数
function getReportTypeLabel(type: ReportType): string {
  const labels: Record<string, string> = {
    SALES_SUMMARY: '売上サマリー',
    ORDER_DETAIL: '注文詳細',
    INVENTORY_STATUS: '在庫状況',
    PRODUCT_PERFORMANCE: '商品パフォーマンス',
    PROFIT_ANALYSIS: '利益分析',
    CUSTOMER_ANALYSIS: '顧客分析',
    MARKETPLACE_COMPARISON: 'マーケットプレイス比較',
    AUDIT_REPORT: '監査レポート',
    CUSTOM: 'カスタム',
  };
  return labels[type] || type;
}

function getFormatExtension(format: ReportFormat): string {
  const extensions: Record<string, string> = {
    PDF: '.pdf',
    EXCEL: '.xlsx',
    CSV: '.csv',
    HTML: '.html',
  };
  return extensions[format] || '';
}

function getFormatMimeType(format: ReportFormat): string {
  const mimeTypes: Record<string, string> = {
    PDF: 'application/pdf',
    EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    CSV: 'text/csv',
    HTML: 'text/html',
  };
  return mimeTypes[format] || 'application/octet-stream';
}
