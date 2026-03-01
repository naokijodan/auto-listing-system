import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { etsyApi, calculateEtsyPrice, EtsyListingData } from './etsy-api';
import { imagePipelineService } from './joom-publish-service';

export interface EtsyPublishResult {
  success: boolean;
  etsyListingId?: number;
  listingUrl?: string;
  error?: string;
}

const log = logger.child({ module: 'etsy-publish-service' });

export class EtsyPublishService {
  // Step 1: EtsyListing レコード作成（DRAFT）
  async createEtsyListing(enrichmentTaskId: string): Promise<string> {
    const task = await prisma.enrichmentTask.findUnique({
      where: { id: enrichmentTaskId },
      include: { product: true },
    });

    if (!task) {
      throw new Error(`EnrichmentTask not found: ${enrichmentTaskId}`);
    }
    if (task.status !== 'APPROVED') {
      throw new Error(`Task not approved: ${task.status}`);
    }

    const translations = (task.translations as any) || {};
    const attributes = (task.attributes as any) || {};
    const title = (translations?.en?.title || task.product.titleEn || task.product.title || '').slice(0, 140);

    const whenMade = this.determineWhenMade(attributes);
    const tags = this.generateEtsyTags(title, attributes?.brand, attributes?.category);

    const etsyListing = await prisma.etsyListing.create({
      data: {
        productId: task.productId,
        listingId: null,
        title,
        description: translations?.en?.description || task.product.descriptionEn || task.product.description || '',
        tags,
        materials: Array.isArray(attributes?.materials) ? attributes.materials : [],
        categoryId: attributes?.taxonomy_id || null,
        whoMade: attributes?.who_made || 'someone_else',
        whenMade,
        isSupply: !!attributes?.is_supply,
        price: undefined,
        quantity: 1,
        shippingProfileId: null,
        status: 'DRAFT',
      },
    });

    log.info({ type: 'etsy_listing_created', etsyListingId: etsyListing.id, productId: task.productId });
    return etsyListing.id;
  }

  // Step 2: 画像処理
  async processImagesForListing(etsyListingId: string): Promise<void> {
    const etsyListing = await prisma.etsyListing.findUnique({
      where: { id: etsyListingId },
      include: { product: true },
    });

    if (!etsyListing) throw new Error(`EtsyListing not found: ${etsyListingId}`);

    const imageResult = await imagePipelineService.processImages(etsyListing.productId, etsyListing.product.images);

    // EnrichmentTask 更新 + EtsyListingをREADYに
    const task = await prisma.enrichmentTask.findUnique({ where: { productId: etsyListing.productId } });
    if (task) {
      await prisma.enrichmentTask.update({
        where: { id: task.id },
        data: {
          bufferedImages: imageResult.buffered,
          optimizedImages: imageResult.optimized,
          imageStatus: 'COMPLETED',
        },
      });
    }

    await prisma.etsyListing.update({ where: { id: etsyListingId }, data: { status: 'READY' } });
    log.info({ type: 'etsy_images_processed', etsyListingId, count: imageResult.optimized.length });
  }

  // Step 3: Etsyに出品
  async publishToEtsy(etsyListingId: string): Promise<EtsyPublishResult> {
    const etsyListing = await prisma.etsyListing.findUnique({
      where: { id: etsyListingId },
      include: { product: true },
    });
    if (!etsyListing) return { success: false, error: 'EtsyListing not found' };

    const task = await prisma.enrichmentTask.findUnique({ where: { productId: etsyListing.productId } });
    if (!task) return { success: false, error: 'EnrichmentTask not found for product' };

    const translations = (task.translations as any) || {};
    const attributes = (task.attributes as any) || {};
    const pricing = (task.pricing as any) || {};

    const title = (etsyListing.title || translations?.en?.title || etsyListing.product.titleEn || etsyListing.product.title || '').slice(0, 140);
    const description = etsyListing.description || translations?.en?.description || etsyListing.product.descriptionEn || etsyListing.product.description || '';
    const optimizedImages: string[] = (task.optimizedImages?.length ? task.optimizedImages : (etsyListing.product.processedImages.length ? etsyListing.product.processedImages : etsyListing.product.images)) || [];

    // 価格計算
    const priceUsd: number = typeof pricing.finalPriceUsd === 'number'
      ? pricing.finalPriceUsd
      : calculateEtsyPrice(typeof pricing.costJpy === 'number' ? pricing.costJpy : etsyListing.product.price);

    // shipping profile: 既存なければ取得
    let shippingProfileId = etsyListing.shippingProfileId || null;
    try {
      if (!shippingProfileId) {
        const profiles = await etsyApi.getShippingProfiles();
        const first = profiles?.results?.[0] || profiles?.shipping_profiles?.[0] || profiles?.[0];
        if (first?.shipping_profile_id || first?.id) {
          shippingProfileId = Number(first.shipping_profile_id || first.id);
        }
      }
    } catch (e) {
      // 取得失敗は後続でエラーに
    }

    // taxonomy id: 必須。なければ失敗
    const taxonomyId = etsyListing.categoryId || attributes?.taxonomy_id;
    if (!taxonomyId) {
      return { success: false, error: 'Etsy taxonomy_id is required' };
    }

    const listingData: EtsyListingData = {
      title,
      description,
      price: priceUsd,
      quantity: 1,
      tags: (etsyListing.tags || []).slice(0, 13),
      materials: etsyListing.materials || undefined,
      taxonomy_id: Number(taxonomyId),
      who_made: (etsyListing.whoMade as any) || 'someone_else',
      when_made: etsyListing.whenMade || this.determineWhenMade(attributes),
      is_supply: !!etsyListing.isSupply,
      shipping_profile_id: Number(shippingProfileId || 0),
      state: 'draft',
    };

    try {
      await prisma.etsyListing.update({ where: { id: etsyListingId }, data: { status: 'PUBLISHING' } });

      // 1. ドラフト作成
      const draftRes = await etsyApi.createDraftListing(listingData);
      const created = (draftRes?.results?.[0] || draftRes?.listing || draftRes) as any;
      const createdId = Number(created?.listing_id || created?.listingId || created?.id);
      if (!createdId) throw new Error('Failed to create Etsy draft listing');

      // 2. 画像アップロード
      for (let i = 0; i < Math.min(10, optimizedImages.length); i++) {
        try {
          const imgUrl = optimizedImages[i];
          const resp = await fetch(imgUrl);
          const arr = await resp.arrayBuffer();
          await etsyApi.uploadListingImage(createdId, Buffer.from(arr), `image-${i}.webp`);
        } catch (e: any) {
          log.error({ type: 'etsy_image_upload_failed', etsyListingId, index: i, error: e.message });
        }
      }

      // 3. 公開
      await etsyApi.publishListing(createdId);

      // 4. Listing テーブルにも記録
      const listing = await prisma.listing.upsert({
        where: {
          productId_marketplace_credentialId: { productId: etsyListing.productId, marketplace: 'ETSY', credentialId: null as unknown as string },
        },
        create: {
          productId: etsyListing.productId,
          marketplace: 'ETSY',
          marketplaceListingId: String(createdId),
          listingPrice: priceUsd,
          currency: 'USD',
          status: 'ACTIVE',
          listedAt: new Date(),
          marketplaceData: {
            title,
            description,
            taxonomyId,
            shippingProfileId,
            images: optimizedImages.slice(0, 10),
          },
        },
        update: {
          marketplaceListingId: String(createdId),
          status: 'ACTIVE',
          listingPrice: priceUsd,
          listedAt: new Date(),
          marketplaceData: {
            title,
            description,
            taxonomyId,
            shippingProfileId,
            images: optimizedImages.slice(0, 10),
          },
        },
      });

      // 5. MarketplaceSyncState を SYNCED
      await prisma.marketplaceSyncState.upsert({
        where: { marketplace_productId: { marketplace: 'ETSY', productId: etsyListing.productId } },
        create: {
          marketplace: 'ETSY',
          productId: etsyListing.productId,
          listingId: String(createdId),
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          localStock: 1,
          remoteStock: 1,
          localPrice: priceUsd,
          remotePrice: priceUsd,
        },
        update: {
          listingId: String(createdId),
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          localPrice: priceUsd,
          remotePrice: priceUsd,
        },
      });

      // 6. EtsyListing更新
      await prisma.etsyListing.update({
        where: { id: etsyListingId },
        data: {
          etsyListingId: createdId,
          status: 'ACTIVE',
          publishedAt: new Date(),
        },
      });

      log.info({ type: 'etsy_publish_success', etsyListingId, createdId, listingId: listing.id });
      return { success: true, etsyListingId: createdId, listingUrl: `https://www.etsy.com/listing/${createdId}` };
    } catch (error: any) {
      await prisma.etsyListing.update({
        where: { id: etsyListingId },
        data: { status: 'ERROR', errorMessage: error.message, errorCount: { increment: 1 } },
      });
      log.error({ type: 'etsy_publish_failed', etsyListingId, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // ヴィンテージ判定
  determineWhenMade(attributes: any): string {
    const year = Number(attributes?.year || attributes?.made_year || attributes?.release_year);
    const currentYear = new Date().getFullYear();
    if (Number.isFinite(year)) {
      if (currentYear - year >= 20) {
        if (year <= 2005) return 'before_2005';
        if (year <= 2009) return '2000_2009';
        if (year <= 2019) return '2010_2019';
        return '2020_2024';
      } else {
        if (year <= 2005) return 'before_2005';
        if (year <= 2009) return '2000_2009';
        if (year <= 2019) return '2010_2019';
        return '2020_2024';
      }
    }
    return 'before_2005';
  }

  // Etsyタグ生成（最大13個）
  generateEtsyTags(title: string, brand?: string, category?: string): string[] {
    const base = `${title} ${brand || ''} ${category || ''}`.toLowerCase();
    const words = base
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter(w => !['the','a','and','for','with','from','of','to','in'].includes(w))
      .slice(0, 30);

    const set = new Set<string>();
    const add = (w: string) => { if (w && set.size < 13) set.add(w); };

    words.forEach(add);
    if (brand) add(brand.toLowerCase());
    if (category) {
      const parts = String(category).toLowerCase().split(/[>\/]/).map(s => s.trim()).filter(Boolean);
      parts.forEach(add);
    }
    ['vintage', 'japanese', 'from japan', 'gift', 'retro'].forEach(add);

    return Array.from(set).slice(0, 13);
  }
}

export const etsyPublishService = new EtsyPublishService();
