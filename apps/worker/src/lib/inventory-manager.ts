import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { ebayApi } from './ebay-api';
import { joomApi } from './joom-api';
import { etsyApi } from './etsy-api';
import { shopifyApi } from './shopify-api';

const log = logger.child({ module: 'inventory-manager' });

type InventoryEventType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN' | 'SYNC' | 'RESERVED';

function computeLocalStockFromProduct(product: any): number {
  if (!product) return 0;
  const status = product.status as string | undefined;
  if (status === 'SOLD' || status === 'OUT_OF_STOCK' || status === 'DELETED' || status === 'ERROR') return 0;
  return 1;
}

export class InventoryManager {
  async recordInventoryChange(params: {
    productId: string;
    eventType: InventoryEventType;
    quantity: number;
    marketplace?: string;
    orderId?: string;
    reason?: string;
  }): Promise<void> {
    const product = await prisma.product.findUnique({ where: { id: params.productId } });
    if (!product) throw new Error(`Product ${params.productId} not found`);

    const prevStock = computeLocalStockFromProduct(product);
    let newStock = prevStock + params.quantity;
    if (newStock < 0) newStock = 0;
    if (newStock > 1) newStock = 1;

    const newStatus = newStock === 0 ? 'OUT_OF_STOCK' : (product.status === 'SOLD' ? 'ACTIVE' : product.status);

    await prisma.product.update({ where: { id: product.id }, data: { status: newStatus as any } });

    const event = await prisma.inventoryEvent.create({
      data: {
        productId: product.id,
        eventType: params.eventType as any,
        quantity: params.quantity,
        prevStock,
        newStock,
        marketplace: params.marketplace as any,
        orderId: params.orderId || null,
        reason: params.reason || null,
        syncedTo: [],
      },
    });

    const syncErrors = await this.syncToAllMarketplaces(product.id, newStock);

    if (syncErrors.length > 0) {
      await prisma.inventoryEvent.update({
        where: { id: event.id },
        data: { syncErrors: syncErrors },
      });
    }

    if (newStock === 0) {
      await this.pauseListingsForProduct(product.id);
    } else if (prevStock === 0 && newStock > 0) {
      await this.resumeListingsForProduct(product.id, newStock);
    }
  }

  async syncToAllMarketplaces(productId: string, newStock: number): Promise<string[]> {
    const listings = await prisma.listing.findMany({ where: { productId } });
    const errors: string[] = [];

    const grouped = listings.reduce<Record<string, any[]>>((acc, l) => {
      const m = l.marketplace as unknown as string;
      acc[m] = acc[m] || [];
      acc[m].push(l);
      return acc;
    }, {});

    const tasks: Array<Promise<void>> = [];

    const updateSyncState = async (marketplace: string, ok: boolean, errorMsg?: string) => {
      try {
        await prisma.marketplaceSyncState.upsert({
          where: { marketplace_productId: { marketplace: marketplace as any, productId } },
          create: {
            marketplace: marketplace as any,
            productId,
            listingId: grouped[marketplace]?.[0]?.marketplaceListingId || null,
            syncStatus: ok ? 'SYNCED' : 'ERROR',
            lastSyncAt: new Date(),
            lastSyncError: ok ? null : (errorMsg || 'Unknown error'),
            localStock: newStock,
            remoteStock: ok ? newStock : null,
          },
          update: {
            listingId: grouped[marketplace]?.[0]?.marketplaceListingId || null,
            syncStatus: ok ? 'SYNCED' : 'ERROR',
            lastSyncAt: new Date(),
            lastSyncError: ok ? null : (errorMsg || 'Unknown error'),
            localStock: newStock,
            remoteStock: ok ? newStock : undefined,
          },
        });
      } catch (e: any) {
        log.error({ type: 'sync_state_update_error', marketplace, productId, error: e.message });
      }
    };

    if (grouped['EBAY']) {
      tasks.push((async () => {
        try {
          for (const listing of grouped['EBAY']) {
            const sku = (listing.marketplaceData as any)?.sku || `RAKUDA-EBAY-${productId}`;
            const res = await ebayApi.updateInventory(sku, newStock);
            if (!res.success) throw new Error(res.error?.message || 'eBay update failed');
          }
          await updateSyncState('EBAY', true);
        } catch (e: any) {
          const msg = `EBAY sync error: ${e.message}`;
          errors.push(msg);
          await updateSyncState('EBAY', false, msg);
          log.error({ type: 'inventory_sync_error', marketplace: 'EBAY', productId, error: e.message });
        }
      })());
    }

    if (grouped['JOOM']) {
      tasks.push((async () => {
        try {
          for (const listing of grouped['JOOM']) {
            const sku = (listing.marketplaceData as any)?.sku || `RAKUDA-${productId}`;
            const joomProductId = listing.marketplaceListingId || (listing.marketplaceData as any)?.joomProductId;
            if (!joomProductId) throw new Error('Missing Joom productId');
            const res = await joomApi.updateInventory(joomProductId, sku, newStock);
            if (!res.success) throw new Error(res.error?.message || 'Joom update failed');
          }
          await updateSyncState('JOOM', true);
        } catch (e: any) {
          const msg = `JOOM sync error: ${e.message}`;
          errors.push(msg);
          await updateSyncState('JOOM', false, msg);
          log.error({ type: 'inventory_sync_error', marketplace: 'JOOM', productId, error: e.message });
        }
      })());
    }

    if (grouped['ETSY']) {
      tasks.push((async () => {
        try {
          for (const listing of grouped['ETSY']) {
            const listingId = Number(listing.marketplaceListingId || (listing.marketplaceData as any)?.listingId);
            if (!listingId) throw new Error('Missing Etsy listingId');
            const products = [{
              sku: (listing.marketplaceData as any)?.sku || `RAKUDA-ETSY-${productId}`,
              property_values: [],
              offerings: [{ quantity: newStock, is_enabled: newStock > 0 }],
            }];
            await etsyApi.updateListingInventory(listingId, products);
          }
          await updateSyncState('ETSY', true);
        } catch (e: any) {
          const msg = `ETSY sync error: ${e.message}`;
          errors.push(msg);
          await updateSyncState('ETSY', false, msg);
          log.error({ type: 'inventory_sync_error', marketplace: 'ETSY', productId, error: e.message });
        }
      })());
    }

    if (grouped['SHOPIFY']) {
      tasks.push((async () => {
        try {
          for (const listing of grouped['SHOPIFY']) {
            const md = (listing.marketplaceData as any) || {};
            const variantId = md.variantId || md.shopifyVariantId;
            let inventoryItemId: string | undefined = md.inventoryItemId;
            const locationId: string | undefined = md.locationId;
            if (!inventoryItemId && variantId) {
              try {
                const p = await shopifyApi.getProduct(listing.marketplaceListingId || '');
                const variant = (p?.product?.variants || []).find((v: any) => String(v.id) === String(variantId));
                inventoryItemId = variant?.inventory_item_id ? String(variant.inventory_item_id) : undefined;
              } catch {}
            }
            if (!inventoryItemId || !locationId) throw new Error('Missing Shopify inventoryItemId/locationId');
            await shopifyApi.setInventoryLevel(inventoryItemId, locationId, newStock);
          }
          await updateSyncState('SHOPIFY', true);
        } catch (e: any) {
          const msg = `SHOPIFY sync error: ${e.message}`;
          errors.push(msg);
          await updateSyncState('SHOPIFY', false, msg);
          log.error({ type: 'inventory_sync_error', marketplace: 'SHOPIFY', productId, error: e.message });
        }
      })());
    }

    await Promise.allSettled(tasks);

    try {
      if (newStock === 0) {
        await prisma.listing.updateMany({ where: { productId }, data: { pausedByInventory: true, status: 'PAUSED' as any } });
      }
    } catch (e: any) {
      log.warn({ type: 'listing_pause_update_failed', productId, error: e.message });
    }

    return errors;
  }

  async pauseListingsForProduct(productId: string): Promise<void> {
    const listings = await prisma.listing.findMany({ where: { productId } });
    await prisma.listing.updateMany({ where: { productId }, data: { pausedByInventory: true, status: 'PAUSED' as any } });
    const tasks: Promise<any>[] = [];
    for (const l of listings) {
      try {
        switch (l.marketplace) {
          case 'EBAY': {
            const sku = (l.marketplaceData as any)?.sku || `RAKUDA-EBAY-${productId}`;
            tasks.push(ebayApi.updateInventory(sku, 0));
            break;
          }
          case 'JOOM': {
            const sku = (l.marketplaceData as any)?.sku || `RAKUDA-${productId}`;
            const joomProductId = l.marketplaceListingId || (l.marketplaceData as any)?.joomProductId;
            if (joomProductId) tasks.push(joomApi.updateInventory(joomProductId, sku, 0));
            break;
          }
          case 'ETSY': {
            const listingId = Number(l.marketplaceListingId || (l.marketplaceData as any)?.listingId);
            if (listingId) tasks.push(etsyApi.updateListingInventory(listingId, [{ sku: (l.marketplaceData as any)?.sku || `RAKUDA-ETSY-${productId}`, property_values: [], offerings: [{ quantity: 0, is_enabled: false }] }]));
            break;
          }
          case 'SHOPIFY': {
            const md = (l.marketplaceData as any) || {};
            const inventoryItemId = md.inventoryItemId;
            const locationId = md.locationId;
            if (inventoryItemId && locationId) tasks.push(shopifyApi.setInventoryLevel(inventoryItemId, locationId, 0));
            break;
          }
        }
      } catch (e: any) {
        log.error({ type: 'pause_listing_error', marketplace: l.marketplace, productId, error: e.message });
      }
    }
    await Promise.allSettled(tasks);
  }

  async resumeListingsForProduct(productId: string, newStock: number): Promise<void> {
    const listings = await prisma.listing.findMany({ where: { productId } });
    await prisma.listing.updateMany({ where: { productId }, data: { pausedByInventory: false, status: 'ACTIVE' as any } });
    const tasks: Promise<any>[] = [];
    for (const l of listings) {
      try {
        switch (l.marketplace) {
          case 'EBAY': {
            const sku = (l.marketplaceData as any)?.sku || `RAKUDA-EBAY-${productId}`;
            tasks.push(ebayApi.updateInventory(sku, newStock));
            break;
          }
          case 'JOOM': {
            const sku = (l.marketplaceData as any)?.sku || `RAKUDA-${productId}`;
            const joomProductId = l.marketplaceListingId || (l.marketplaceData as any)?.joomProductId;
            if (joomProductId) tasks.push(joomApi.updateInventory(joomProductId, sku, newStock));
            break;
          }
          case 'ETSY': {
            const listingId = Number(l.marketplaceListingId || (l.marketplaceData as any)?.listingId);
            if (listingId) tasks.push(etsyApi.updateListingInventory(listingId, [{ sku: (l.marketplaceData as any)?.sku || `RAKUDA-ETSY-${productId}`, property_values: [], offerings: [{ quantity: newStock, is_enabled: newStock > 0 }] }]));
            break;
          }
          case 'SHOPIFY': {
            const md = (l.marketplaceData as any) || {};
            const inventoryItemId = md.inventoryItemId;
            const locationId = md.locationId;
            if (inventoryItemId && locationId) tasks.push(shopifyApi.setInventoryLevel(inventoryItemId, locationId, newStock));
            break;
          }
        }
      } catch (e: any) {
        log.error({ type: 'resume_listing_error', marketplace: l.marketplace, productId, error: e.message });
      }
    }
    await Promise.allSettled(tasks);
  }

  async reconcileInventory(productId: string): Promise<{
    product: { id: string; localStock: number };
    marketplaces: Array<{ marketplace: string; remoteStock: number | null; inSync: boolean }>;
  }> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error(`Product ${productId} not found`);
    const localStock = computeLocalStockFromProduct(product);
    const listings = await prisma.listing.findMany({ where: { productId } });

    const results: Array<{ marketplace: string; remoteStock: number | null; inSync: boolean }> = [];

    for (const l of listings) {
      let remoteStock: number | null = null;
      try {
        switch (l.marketplace) {
          case 'EBAY':
            remoteStock = null; // Not easily retrievable; treat as unknown
            break;
          case 'JOOM':
            remoteStock = null;
            break;
          case 'ETSY':
            remoteStock = null;
            break;
          case 'SHOPIFY':
            remoteStock = null;
            break;
        }
      } catch (e: any) {
        log.warn({ type: 'reconcile_fetch_error', marketplace: l.marketplace, productId, error: e.message });
      }

      const inSync = remoteStock === null ? true : remoteStock === localStock;
      results.push({ marketplace: l.marketplace as any, remoteStock, inSync });
    }

    const hasDiff = results.some(r => r.remoteStock !== null && r.remoteStock !== localStock);
    if (hasDiff) {
      await prisma.inventoryEvent.create({
        data: {
          productId,
          eventType: 'SYNC' as any,
          quantity: 0,
          prevStock: localStock,
          newStock: localStock,
          reason: 'Reconcile inventory differences',
          syncedTo: [],
        },
      });
      await this.syncToAllMarketplaces(productId, localStock);
    }

    await Promise.allSettled(results.map(r =>
      prisma.marketplaceSyncState.upsert({
        where: { marketplace_productId: { marketplace: r.marketplace as any, productId } },
        create: {
          marketplace: r.marketplace as any,
          productId,
          localStock,
          remoteStock: r.remoteStock,
          syncStatus: r.inSync ? 'SYNCED' : 'STALE',
          lastSyncAt: new Date(),
        },
        update: {
          localStock,
          remoteStock: r.remoteStock,
          syncStatus: r.inSync ? 'SYNCED' : 'STALE',
          lastSyncAt: new Date(),
        },
      })
    ));

    return { product: { id: productId, localStock }, marketplaces: results };
  }

  async getInventorySummary(): Promise<{
    totalProducts: number;
    inStock: number;
    outOfStock: number;
    byMarketplace: Record<string, { listed: number; synced: number; errors: number }>;
  }> {
    const [totalProducts, listings, syncStates, errorEvents] = await Promise.all([
      prisma.product.count(),
      prisma.listing.groupBy({ by: ['marketplace'], _count: true }),
      prisma.marketplaceSyncState.groupBy({ by: ['marketplace', 'syncStatus'], _count: true }),
      prisma.inventoryEvent.count({ where: { syncErrors: { not: null } } }),
    ]);

    const statusCounts = await prisma.product.groupBy({ by: ['status'], _count: true });
    const inStock = statusCounts.filter(s => s.status !== 'SOLD' && s.status !== 'OUT_OF_STOCK' && s.status !== 'DELETED').reduce((n, s) => n + s._count, 0);
    const outOfStock = totalProducts - inStock;

    const byMarketplace: Record<string, { listed: number; synced: number; errors: number }> = {};
    for (const l of listings) {
      byMarketplace[l.marketplace as any] = byMarketplace[l.marketplace as any] || { listed: 0, synced: 0, errors: 0 };
      byMarketplace[l.marketplace as any].listed = l._count;
    }
    for (const s of syncStates) {
      const key = s.marketplace as any;
      byMarketplace[key] = byMarketplace[key] || { listed: 0, synced: 0, errors: 0 };
      if (s.syncStatus === 'SYNCED') byMarketplace[key].synced += s._count;
      if (s.syncStatus === 'ERROR') byMarketplace[key].errors += s._count;
    }
    if (errorEvents > 0) {
      byMarketplace['ALL'] = { listed: 0, synced: 0, errors: errorEvents };
    }

    return { totalProducts, inStock, outOfStock, byMarketplace };
  }
}

export const inventoryManager = new InventoryManager();

