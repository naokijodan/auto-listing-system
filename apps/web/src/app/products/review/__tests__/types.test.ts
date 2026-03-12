import { describe, it, expect } from 'vitest';
import { JoomPreviewDataSchema } from '../types';

describe('JoomPreviewDataSchema', () => {
  const validData = {
    product: { id: '1', title: 'Test', price: 1000, status: 'READY_TO_REVIEW' },
    joomPreview: {
      id: 'j1', name: 'Test Product', description: 'desc', mainImage: 'https://example.com/img.jpg',
      extraImages: [], price: 29.99, currency: 'USD', quantity: 1,
      shipping: { price: 5.99, time: '7-14 days' }, tags: ['watch'], parentSku: 'PS1', sku: 'S1',
    },
    pricing: {
      originalPriceJpy: 3000, costUsd: 20, shippingCost: 5.99, platformFee: 3,
      paymentFee: 1, profit: 5, finalPriceUsd: 29.99, exchangeRate: 150,
    },
    validation: { passed: true, warnings: [] },
    seo: { score: 75, estimatedVisibility: 'medium' as const },
  };

  it('should accept valid data', () => {
    const result = JoomPreviewDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing product.id', () => {
    const invalid = { ...validData, product: { ...validData.product, id: undefined as any } };
    const result = JoomPreviewDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid seo.estimatedVisibility', () => {
    const invalid = { ...validData, seo: { score: 50, estimatedVisibility: 'ultra' as any } };
    const result = JoomPreviewDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept optional titleEn', () => {
    const withTitleEn = { ...validData, product: { ...validData.product, titleEn: 'Test EN' } };
    const result = JoomPreviewDataSchema.safeParse(withTitleEn);
    expect(result.success).toBe(true);
  });

  it('should reject non-number price', () => {
    const invalid = { ...validData, pricing: { ...validData.pricing, profit: 'abc' as any } };
    const result = JoomPreviewDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty object', () => {
    const result = JoomPreviewDataSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject missing validation.warnings array', () => {
    const invalid = { ...validData, validation: { passed: true } as any };
    const result = JoomPreviewDataSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

