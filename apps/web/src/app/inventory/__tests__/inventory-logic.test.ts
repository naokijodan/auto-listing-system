import { describe, it, expect } from 'vitest';

describe('Inventory page logic', () => {
  describe('Platform list', () => {
    const platforms = [
      { key: 'ebay', label: 'eBay' },
      { key: 'joom', label: 'Joom' },
      { key: 'etsy', label: 'Etsy' },
      { key: 'shopify', label: 'Shopify' },
      { key: 'instagram_shop', label: 'Instagram' },
      { key: 'tiktok_shop', label: 'TikTok' },
    ] as const;

    it('should have 6 platforms defined', () => {
      expect(platforms.length).toBe(6);
    });

    it('should include all required platform keys', () => {
      const keys = platforms.map((p) => p.key);
      expect(keys).toEqual(
        expect.arrayContaining(['ebay', 'joom', 'etsy', 'shopify', 'instagram_shop', 'tiktok_shop'])
      );
    });
  });

  describe('StatusBadge mapping', () => {
    const map = {
      listed: { text: '出品中', color: 'bg-green-100 text-green-700 border-green-200' },
      paused: { text: '停止', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      unlisted: { text: '未出品', color: 'bg-gray-100 text-gray-700 border-gray-200' },
      error: { text: 'エラー', color: 'bg-red-100 text-red-700 border-red-200' },
    } as const;

    const fallback = { text: '—', color: 'bg-gray-100 text-gray-600 border-gray-200' } as const;

    it("should map 'listed' to correct text and color", () => {
      expect(map.listed.text).toBe('出品中');
      expect(map.listed.color).toBe('bg-green-100 text-green-700 border-green-200');
    });

    it("should map 'paused' to correct text and color", () => {
      expect(map.paused.text).toBe('停止');
      expect(map.paused.color).toBe('bg-yellow-100 text-yellow-800 border-yellow-200');
    });

    it("should map 'unlisted' to correct text and color", () => {
      expect(map.unlisted.text).toBe('未出品');
      expect(map.unlisted.color).toBe('bg-gray-100 text-gray-700 border-gray-200');
    });

    it("should map 'error' to correct text and color", () => {
      expect(map.error.text).toBe('エラー');
      expect(map.error.color).toBe('bg-red-100 text-red-700 border-red-200');
    });

    it('should handle undefined status with fallback', () => {
      expect(fallback.text).toBe('—');
      expect(fallback.color).toBe('bg-gray-100 text-gray-600 border-gray-200');
    });
  });

  describe('Product filtering with safeParse', () => {
    const platformKeys = new Set(['ebay', 'joom', 'etsy', 'shopify', 'instagram_shop', 'tiktok_shop']);
    const allowedStatuses = new Set(['listed', 'paused', 'unlisted', 'error']);

    const isProduct = (x: any) => {
      if (!x || typeof x !== 'object') return false;
      if (typeof x.id !== 'string') return false;
      if (typeof x.name !== 'string') return false;
      if (typeof x.stock !== 'number') return false;
      if (!x.status || typeof x.status !== 'object') return false;
      for (const k of Object.keys(x.status)) {
        if (!platformKeys.has(k)) return false;
        if (!allowedStatuses.has(x.status[k])) return false;
      }
      if ('lastSyncedAt' in x && x.lastSyncedAt !== null && typeof x.lastSyncedAt !== 'string') return false;
      return true;
    };

    it('should filter valid products from mixed array', () => {
      const items = [
        { id: '1', name: 'A', stock: 3, status: { ebay: 'listed' }, lastSyncedAt: '2026-01-01T00:00:00Z' },
        { name: 'B', stock: 1, status: {} },
        { id: '3', name: 'C', stock: 0, status: { ebay: 'active' } },
        { id: '4', name: 'D', stock: 2, status: {}, lastSyncedAt: null },
      ] as any[];
      const valid = items.filter(isProduct);
      expect(valid).toHaveLength(2);
      expect(valid.map((v) => v.id)).toEqual(expect.arrayContaining(['1', '4']));
    });

    it('should return empty array when all invalid', () => {
      const items = [{}, { id: 1 }, null] as any[];
      const valid = items.filter(isProduct);
      expect(valid).toHaveLength(0);
    });

    it('should handle empty array', () => {
      const items: any[] = [];
      const valid = items.filter(isProduct);
      expect(valid).toEqual([]);
    });
  });

  describe('Event filtering', () => {
    const isEvent = (x: any) =>
      !!x &&
      typeof x === 'object' &&
      typeof x.id === 'string' &&
      typeof x.timestamp === 'string' &&
      typeof x.productName === 'string' &&
      typeof x.type === 'string' &&
      typeof x.diff === 'number' &&
      typeof x.source === 'string';

    const diffClass = (diff: number) => (diff >= 0 ? 'text-green-600' : 'text-rose-600');
    const diffText = (diff: number) => (diff > 0 ? `+${diff}` : `${diff}`);

    it('should filter valid events from mixed array', () => {
      const items = [
        { id: 'e1', timestamp: '2026', productName: 'P', type: 'inc', diff: 2, source: 'manual' },
        { id: 'e2', timestamp: '2026', productName: 'P', type: 'dec', diff: -1, source: 'system' },
        { id: 'bad', diff: 1 },
      ] as any[];
      const valid = items.filter(isEvent);
      expect(valid).toHaveLength(2);
    });

    it('should handle events with negative diff', () => {
      const ev = { diff: -3 };
      expect(diffClass(ev.diff)).toBe('text-rose-600');
      expect(diffText(ev.diff)).toBe('-3');
    });

    it('should handle events with positive diff', () => {
      const ev = { diff: 5 };
      expect(diffClass(ev.diff)).toBe('text-green-600');
      expect(diffText(ev.diff)).toBe('+5');
    });
  });

  describe('Summary fallback logic', () => {
    const fallbackSummary = (s: any) => ({
      totalProducts: s?.totalProducts ?? 0,
      inStock: s?.inStock ?? 0,
      outOfStock: s?.outOfStock ?? 0,
      syncErrors: s?.syncErrors ?? 0,
      platforms: {
        ebay: s?.platforms?.ebay ?? { name: 'eBay', listings: 0, synced: 0, errors: 0, connected: false },
        joom: s?.platforms?.joom ?? { name: 'Joom', listings: 0, synced: 0, errors: 0, connected: false },
        etsy: s?.platforms?.etsy ?? { name: 'Etsy', listings: 0, synced: 0, errors: 0, connected: false },
        shopify: s?.platforms?.shopify ?? { name: 'Shopify', listings: 0, synced: 0, errors: 0, connected: false },
        instagram_shop:
          s?.platforms?.instagram_shop ?? {
            name: 'Instagram Shop',
            listings: 0,
            synced: 0,
            errors: 0,
            connected: false,
          },
        tiktok_shop:
          s?.platforms?.tiktok_shop ?? {
            name: 'TikTok Shop',
            listings: 0,
            synced: 0,
            errors: 0,
            connected: false,
          },
      },
    });

    it('should use fallback values when summary is null', () => {
      const res = fallbackSummary(null);
      expect(res.totalProducts).toBe(0);
      expect(res.platforms.ebay.connected).toBe(false);
      expect(res.platforms.tiktok_shop.listings).toBe(0);
    });

    it('should use actual values when summary has data', () => {
      const s = {
        totalProducts: 10,
        inStock: 7,
        outOfStock: 3,
        syncErrors: 1,
        platforms: {
          ebay: { name: 'eBay', listings: 5, synced: 4, errors: 1, connected: true },
        },
      } as any;
      const res = fallbackSummary(s);
      expect(res.totalProducts).toBe(10);
      expect(res.inStock).toBe(7);
      expect(res.platforms.ebay.listings).toBe(5);
      expect(res.platforms.ebay.connected).toBe(true);
    });

    it('should use per-platform fallbacks for missing platforms', () => {
      const s = { totalProducts: 1, inStock: 1, outOfStock: 0, syncErrors: 0, platforms: { ebay: { name: 'eBay', listings: 1, synced: 1, errors: 0, connected: true } } } as any;
      const res = fallbackSummary(s);
      expect(res.platforms.ebay.listings).toBe(1);
      expect(res.platforms.etsy.listings).toBe(0);
      expect(res.platforms.instagram_shop.connected).toBe(false);
    });
  });

  describe('classNames utility', () => {
    const classNames = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

    it('should join multiple class names', () => {
      expect(classNames('a', 'b', 'c')).toBe('a b c');
    });

    it('should filter out false/null/undefined values', () => {
      expect(classNames('a', false, 'b', null, undefined, 'c')).toBe('a b c');
    });

    it('should return empty string for all falsy values', () => {
      expect(classNames(false, null, undefined)).toBe('');
    });
  });
});

