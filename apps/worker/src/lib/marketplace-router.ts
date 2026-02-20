import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

export type MarketplaceTarget = 'JOOM' | 'EBAY' | 'ETSY' | 'SHOPIFY';

export interface RoutingResult {
  targets: MarketplaceTarget[];
  reasons: Record<MarketplaceTarget, string>;
}

const log = logger.child({ module: 'marketplace-router' });

export class MarketplaceRouter {
  async routeProduct(productId: string): Promise<RoutingResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { enrichmentTask: true },
    });
    if (!product) throw new Error(`Product ${productId} not found`);

    const targets: MarketplaceTarget[] = [];
    const reasons: Record<string, string> = {};

    const priceJpy = product.price;
    const isVintage = this.isVintageItem(product as any);
    const hasBrand = !!product.brand;

    if (priceJpy > 900000) {
      targets.push('EBAY');
      reasons['EBAY'] = `高価格帯商品（¥${priceJpy.toLocaleString()}）: Joom価格上限超過のためeBay専用`;
    } else {
      targets.push('JOOM');
      reasons['JOOM'] = `標準価格帯: Joom出品対象`;
      targets.push('EBAY');
      reasons['EBAY'] = `チャンネル拡大: eBay出品対象`;
    }

    if (isVintage) {
      targets.push('ETSY');
      reasons['ETSY'] = `ヴィンテージ品: Etsy出品対象（AI購入連携あり）`;
    }

    if (hasBrand || priceJpy > 30000) {
      targets.push('SHOPIFY');
      reasons['SHOPIFY'] = `ブランド品/高単価: Shopify出品対象（AIコマース最適化）`;
    }

    const uniqueTargets = [...new Set(targets)];
    log.info({ type: 'route_product', productId, targets: uniqueTargets, reasons });
    return { targets: uniqueTargets, reasons: reasons as Record<MarketplaceTarget, string> };
  }

  isVintageItem(product: { attributes?: any; title?: string; category?: string }): boolean {
    const currentYear = new Date().getFullYear();
    const attrs = product.attributes as Record<string, any> | null;
    if (attrs) {
      const year = attrs.year || attrs.製造年 || attrs.production_year;
      if (year && typeof year === 'number' && year <= currentYear - 20) return true;
    }
    const title = product.title || '';
    const vintageKeywords = ['ヴィンテージ', 'ビンテージ', 'vintage', 'アンティーク', 'antique', 'レトロ'];
    if (vintageKeywords.some(kw => title.toLowerCase().includes(kw))) return true;
    const cat = product.category || '';
    if (cat.includes('ヴィンテージ') || cat.includes('アンティーク')) return true;
    return false;
  }
}

export const marketplaceRouter = new MarketplaceRouter();

