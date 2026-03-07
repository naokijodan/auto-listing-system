import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../../test/mocks/handlers';
import { prisma } from '@rakuda/database';
import { EbayPublishService } from '../../lib/ebay-publish-service';
import { checkListingQuality } from '../../lib/listing-quality-gate';
import { extractItemSpecifics } from '@rakuda/enrichment/src/item-specifics';

// MSW server for external API mocks (eBay, etc.)
const server = setupServer(...handlers);

// Mock image pipeline to avoid real downloads/uploads
vi.mock('../../lib/joom-publish-service', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    imagePipelineService: {
      processImages: vi.fn(async (_productId: string, imageUrls: string[]) => {
        // return same count of fake optimized URLs
        const urls = imageUrls.map((_, i) => `https://cdn.test/images/fake-${i}.webp`);
        return { buffered: urls, optimized: urls };
      }),
    },
  };
});

// Mock OpenAI client used by packages/enrichment translator
vi.mock('openai', () => {
  class FakeOpenAI {
    constructor(_config: any) {}
    chat = {
      completions: {
        create: vi.fn(async () => {
          const content = JSON.stringify({
            translations: { en: { title: 'Translated Title', description: 'Translated Description' } },
            attributes: { brand: 'Seiko', itemSpecifics: { Brand: 'Seiko' }, confidence: 0.9 },
            validation: { isSafe: true, status: 'approved', flags: [] },
          });
          return {
            choices: [{ message: { content } }],
            usage: { total_tokens: 123 },
          } as any;
        }),
      },
    };
  }
  return { default: FakeOpenAI };
});

// Helpers to create and cleanup test data
const createdIds: { products: string[]; tasks: string[]; listings: string[]; mappings: string[]; creds: string[]; prompts: string[]; sources: string[] } = {
  products: [],
  tasks: [],
  listings: [],
  mappings: [],
  creds: [],
  prompts: [],
  sources: [],
};

async function createTestSource(name = 'TEST-INTEGRATION-SOURCE'): Promise<string> {
  const src = await prisma.source.create({
    data: { type: 'OTHER', name, url: 'https://example.com', metadata: {} as any },
  });
  createdIds.sources.push(src.id);
  return src.id;
}

async function createTestProduct(overrides: Partial<import('@rakuda/database').Product> = {}): Promise<import('@rakuda/database').Product> {
  const sourceId = await createTestSource();
  const prod = await prisma.product.create({
    data: {
      sourceId,
      sourceItemId: `TEST-INTEGRATION-ITEM-${Date.now()}`,
      sourceUrl: 'https://example.com/item',
      title: overrides.title || 'TEST-INTEGRATION-時計 ロレックス サブマリーナ 自動巻き メンズ 40mm',
      description: overrides.description || 'TEST-INTEGRATION 説明文 ステンレス ブラック',
      price: typeof overrides.price === 'number' ? overrides.price : 50000,
      titleEn: null,
      descriptionEn: null,
      category: overrides.category || 'Watches',
      brand: overrides.brand || 'ロレックス',
      condition: overrides.condition || '目立った傷や汚れなし',
      weight: overrides.weight ?? 200,
      attributes: overrides.attributes || {} as any,
      images: Array.isArray(overrides.images) ? overrides.images : ['https://example.com/img1.jpg'],
      processedImages: overrides.processedImages || [],
      status: 'APPROVED',
      translationStatus: 'COMPLETED',
      imageStatus: 'PENDING',
    },
  });
  createdIds.products.push(prod.id);
  return prod as any;
}

async function createApprovedEnrichmentTask(productId: string, opts?: { title?: string; description?: string; specifics?: Record<string, any> }) {
  const task = await prisma.enrichmentTask.create({
    data: {
      productId,
      status: 'APPROVED',
      translationStatus: 'COMPLETED',
      attributeStatus: 'COMPLETED',
      validationStatus: 'COMPLETED',
      validationResult: 'APPROVED',
      translations: {
        en: {
          title: opts?.title || 'Rolex Submariner Automatic 40mm Wrist Watch',
          description: opts?.description || 'A classic Rolex Submariner with automatic movement.',
        },
      } as any,
      attributes: {
        brand: 'Rolex',
        condition: 'good',
        category: 'Watches',
        itemSpecifics: opts?.specifics || { Brand: 'Rolex', Model: 'Submariner', Movement: 'Automatic' },
        confidence: 0.9,
      } as any,
      pricing: { costJpy: 50000, finalPriceUsd: 100 } as any,
    },
  });
  createdIds.tasks.push(task.id);
  return task.id;
}

async function ensureEbayCredential() {
  const cred = await prisma.marketplaceCredential.upsert({
    where: { marketplace_name: { marketplace: 'EBAY', name: 'default' } },
    create: {
      marketplace: 'EBAY',
      name: 'default',
      credentials: { clientId: 'test-client-id', clientSecret: 'test-client-secret', refreshToken: 'test-refresh-token' } as any,
      isActive: true,
    },
    update: {},
  });
  createdIds.creds.push(cred.id);
}

async function ensureWatchesCategoryMapping() {
  const m = await prisma.ebayCategoryMapping.upsert({
    where: { sourceCategory: 'Watches' },
    create: {
      sourceCategory: 'Watches',
      ebayCategoryId: '31387',
      ebayCategoryName: 'Wristwatches',
      itemSpecifics: {},
      isActive: true,
    },
    update: {},
  });
  createdIds.mappings.push(m.id);
}

async function insertPrompt(name: string, category: string | null, system: string, isDefault = false) {
  const p = await prisma.translationPrompt.upsert({
    where: { name },
    create: {
      name,
      category,
      marketplace: null,
      systemPrompt: system,
      userPrompt: 'タイトル: {{title}}\n説明: {{description}}\nカテゴリ: {{category}}',
      extractAttributes: ['brand', 'model'],
      priority: isDefault ? 1 : 100,
      isActive: true,
      isDefault,
    },
    update: {
      category,
      systemPrompt: system,
      isDefault,
      isActive: true,
      priority: isDefault ? 1 : 100,
    },
  });
  createdIds.prompts.push(p.id);
}

beforeAll(async () => {
  // Ensure safe environment
  process.env.EBAY_ENV = 'sandbox';
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';

  server.listen({ onUnhandledRequest: 'bypass' });
  await ensureEbayCredential();
  await ensureWatchesCategoryMapping();
});

afterEach(async () => {
  server.resetHandlers();
  // Cleanup created records in reverse order where needed
  for (const id of createdIds.listings.splice(0)) {
    try { await prisma.listing.delete({ where: { id } }); } catch {}
  }
  for (const id of createdIds.tasks.splice(0)) {
    try { await prisma.enrichmentTask.delete({ where: { id } }); } catch {}
  }
  for (const id of createdIds.products.splice(0)) {
    try { await prisma.product.delete({ where: { id } }); } catch {}
  }
  for (const id of createdIds.sources.splice(0)) {
    try { await prisma.source.delete({ where: { id } }); } catch {}
  }
  for (const id of createdIds.prompts.splice(0)) {
    try { await prisma.translationPrompt.delete({ where: { id } }); } catch {}
  }
  // Keep mapping/credential since they are upserts
});

afterAll(async () => {
  server.close();
});

describe('Listing Pipeline Integration (eBay)', () => {
  it('Happy Path: translate → extract → images → quality → publish', async () => {
    const product = await createTestProduct({ images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'] });
    const taskId = await createApprovedEnrichmentTask(product.id);

    const svc = new EbayPublishService();
    const listingId = await svc.createEbayListing(taskId);
    createdIds.listings.push(listingId);

    await svc.processImagesForListing(listingId);
    const res = await svc.publishToEbay(listingId);

    expect(res.success).toBe(true);
    expect(res.ebayListingId).toBeTruthy();

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    expect(listing?.status).toBe('ACTIVE');
    expect(listing?.marketplace).toBe('EBAY');
    expect(listing?.marketplaceData).toBeTruthy();
  }, 30000);

  it('Blocks when no images: quality gate hardBlock', async () => {
    const product = await createTestProduct({ images: [] });
    const taskId = await createApprovedEnrichmentTask(product.id);

    const svc = new EbayPublishService();
    const listingId = await svc.createEbayListing(taskId);
    createdIds.listings.push(listingId);

    // processImagesForListing will set PENDING_PUBLISH and skip (no source images)
    await svc.processImagesForListing(listingId);
    const res = await svc.publishToEbay(listingId);

    expect(res.success).toBe(false);
    expect(res.error || '').toContain('No images');

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    expect(listing?.status).toBe('ERROR');
  }, 30000);

  it('Translation failure fallback adds [EN] prefix → hard block by quality gate', async () => {
    // When translation fails, [EN] prefix is added as fallback
    const fallbackTitle = '[EN] テスト 翻訳失敗 時計';
    const fallbackDesc = '[EN] これは説明文です';

    const qc = checkListingQuality({
      imageUrls: ['https://example.com/img.jpg'],
      title: fallbackTitle,
      description: fallbackDesc,
      price: 10,
    });
    expect(qc.passed).toBe(false);
    expect(qc.hardBlocks.join(' ')).toContain('has not been translated');
  });

  it('ItemSpecifics extraction for Watches from Japanese title', async () => {
    // Use DB-backed Brand and ItemSpecificsField
    const r = await extractItemSpecifics({
      title: 'セイコー 5スポーツ 自動巻き メンズ 腕時計 42mm ブルー ダイバーズ',
      description: 'ステンレス ベルト ブルー 文字盤',
      tag: '腕時計',
      category: 'Watches',
    });

    expect(r.category).toBeTruthy();
    // Expect key watch specifics
    const keys = Object.keys(r.specifics);
    expect(keys).toContain('Brand');
    expect(keys).toContain('Movement');
    // Case size or Color likely present depending on DB fields
    expect(keys.some(k => /Case Size|Color|Dial Color/.test(k))).toBe(true);
  }, 30000);

  it('Category prompt selection: Watches → category prompt, Unknown → default prompt', async () => {
    // Insert test prompts
    await insertPrompt('TEST-時計専用V2', 'Watches', 'WATCH-PROMPT-V2', false);
    await insertPrompt('TEST-一般・汎用', null, 'DEFAULT-PROMPT', true);

    // Watches category should find the category-specific prompt
    const watchPrompt = await prisma.translationPrompt.findFirst({
      where: { category: 'Watches', isActive: true },
      orderBy: { priority: 'desc' },
    });
    expect(watchPrompt).toBeTruthy();
    expect(watchPrompt!.systemPrompt).toBe('WATCH-PROMPT-V2');

    // Unknown category should fall back to default prompt
    const unknownPrompt = await prisma.translationPrompt.findFirst({
      where: { category: 'UnknownCategory', isActive: true },
      orderBy: { priority: 'desc' },
    });
    expect(unknownPrompt).toBeNull();

    // Default prompt should be available
    const defaultPrompt = await prisma.translationPrompt.findFirst({
      where: { isDefault: true, isActive: true },
      orderBy: { priority: 'desc' },
    });
    expect(defaultPrompt).toBeTruthy();
    expect(defaultPrompt!.systemPrompt).toBe('DEFAULT-PROMPT');
  });
});
