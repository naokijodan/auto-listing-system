import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';

// Mock enrichment module
vi.mock('@rakuda/enrichment', () => ({
  enrichProductFull: vi.fn(),
  quickValidate: vi.fn().mockReturnValue({ canProcess: true, flags: [] }),
}));

// Mock OpenAI module
vi.mock('../../lib/openai', () => ({
  isOpenAIConfigured: vi.fn(),
  translateProduct: vi.fn(),
}));

import { processTranslateJob } from '../../processors/translate';
import { isOpenAIConfigured, translateProduct } from '../../lib/openai';
import { enrichProductFull, quickValidate } from '@rakuda/enrichment';

const mockIsOpenAIConfigured = vi.mocked(isOpenAIConfigured);
const mockTranslateProduct = vi.mocked(translateProduct);
const mockEnrichProductFull = vi.mocked(enrichProductFull);
const mockQuickValidate = vi.mocked(quickValidate);

describe('Translate Processor', () => {
  const mockJob = {
    id: 'job-123',
    data: {
      productId: 'product-1',
      title: 'テスト商品',
      description: 'これはテスト商品の説明です',
      extractAttributes: true,
      useEnrichment: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.product.update.mockResolvedValue({ id: 'product-1' });
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
    mockQuickValidate.mockReturnValue({ canProcess: true, flags: [] });
  });

  describe('with enrichment enabled (default)', () => {
    beforeEach(() => {
      mockEnrichProductFull.mockResolvedValue({
        translations: {
          en: { title: 'Test Product', description: 'This is a test product description' },
          ru: { title: 'Тестовый продукт', description: 'Это описание тестового продукта' },
        },
        attributes: {
          brand: 'TestBrand',
          model: 'Model-1',
          color: 'Red',
          size: 'M',
          material: 'Cotton',
          condition: 'New',
          category: 'Electronics',
          itemSpecifics: {},
          confidence: 0.9,
        },
        validation: {
          status: 'approved',
          passed: true,
          flags: [],
          riskScore: 0,
        },
        tokensUsed: 150,
      });
    });

    it('should enrich product using enrichment engine', async () => {
      const result = await processTranslateJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.titleEn).toBe('Test Product');
      expect(result.descriptionEn).toBe('This is a test product description');
      expect(result.tokensUsed).toBe(150);
      expect(mockEnrichProductFull).toHaveBeenCalledWith('テスト商品', 'これはテスト商品の説明です');
    });

    it('should include Russian translation', async () => {
      const result = await processTranslateJob(mockJob);

      expect(result.titleRu).toBe('Тестовый продукт');
      expect(result.descriptionRu).toBe('Это описание тестового продукта');
    });

    it('should update product status to APPROVED when validation passes', async () => {
      await processTranslateJob(mockJob);

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            translationStatus: 'COMPLETED',
          }),
        })
      );
    });

    it('should update product status to READY_TO_REVIEW when review required', async () => {
      mockEnrichProductFull.mockResolvedValue({
        translations: {
          en: { title: 'Test', description: 'Test desc' },
        },
        attributes: {
          confidence: 0.5,
          itemSpecifics: {},
        },
        validation: {
          status: 'review_required',
          passed: true,
          flags: ['low_confidence'],
          riskScore: 30,
        },
        tokensUsed: 100,
      });

      await processTranslateJob(mockJob);

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'READY_TO_REVIEW',
          }),
        })
      );
    });

    it('should update product status to ERROR when validation rejects', async () => {
      mockEnrichProductFull.mockResolvedValue({
        translations: {
          en: { title: 'Test', description: 'Test desc' },
        },
        attributes: {
          confidence: 0.9,
          itemSpecifics: {},
        },
        validation: {
          status: 'rejected',
          passed: false,
          flags: ['prohibited_item'],
          riskScore: 100,
        },
        tokensUsed: 50,
      });

      const result = await processTranslateJob(mockJob);

      expect(result.success).toBe(false);
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ERROR',
            lastError: expect.stringContaining('禁制品検出'),
          }),
        })
      );
    });

    it('should reject early if quick validation fails', async () => {
      mockQuickValidate.mockReturnValue({
        canProcess: false,
        flags: ['prohibited_keyword'],
      });

      const result = await processTranslateJob(mockJob);

      expect(result.success).toBe(false);
      expect(result.validation?.status).toBe('rejected');
      expect(mockEnrichProductFull).not.toHaveBeenCalled();
    });

    it('should create job log on success', async () => {
      await processTranslateJob(mockJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'translate',
          jobType: 'TRANSLATE',
          status: 'COMPLETED',
        }),
      });
    });
  });

  describe('with enrichment disabled (legacy mode)', () => {
    const legacyJob = {
      ...mockJob,
      data: { ...mockJob.data, useEnrichment: false },
    };

    beforeEach(() => {
      mockIsOpenAIConfigured.mockReturnValue(true);
    });

    it('should translate product using OpenAI', async () => {
      mockTranslateProduct.mockResolvedValue({
        titleEn: 'Test Product',
        descriptionEn: 'This is a test product description',
        attributes: {
          brand: 'TestBrand',
          model: 'Model-1',
          color: 'Red',
          confidence: 0.9,
          extractedBy: 'openai' as const,
        },
        tokensUsed: 150,
      });

      const result = await processTranslateJob(legacyJob);

      expect(result.success).toBe(true);
      expect(result.titleEn).toBe('Test Product');
      expect(result.descriptionEn).toBe('This is a test product description');
      expect(result.tokensUsed).toBe(150);
    });

    it('should update product status to READY_TO_REVIEW', async () => {
      mockTranslateProduct.mockResolvedValue({
        titleEn: 'Test Product',
        descriptionEn: 'Test desc',
        tokensUsed: 100,
      });

      await processTranslateJob(legacyJob);

      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'READY_TO_REVIEW',
            translationStatus: 'COMPLETED',
          }),
        })
      );
    });
  });

  describe('without OpenAI configured (placeholder mode)', () => {
    const noEnrichmentJob = {
      ...mockJob,
      data: { ...mockJob.data, useEnrichment: false },
    };

    beforeEach(() => {
      mockIsOpenAIConfigured.mockReturnValue(false);
    });

    it('should use placeholder translation', async () => {
      const result = await processTranslateJob(noEnrichmentJob);

      expect(result.success).toBe(true);
      expect(result.titleEn).toBe('[EN] テスト商品');
      expect(result.descriptionEn).toBe('[EN] これはテスト商品の説明です');
      expect(result.tokensUsed).toBe(0);
      expect(result.message).toContain('placeholder');
    });

    it('should include placeholder attributes when extractAttributes is true', async () => {
      const result = await processTranslateJob(noEnrichmentJob);

      expect(result.attributes).toEqual({
        brand: null,
        model: null,
        color: null,
        confidence: 0,
        extractedBy: 'placeholder',
      });
    });

    it('should not include attributes when extractAttributes is false', async () => {
      const jobWithoutAttributes = {
        ...noEnrichmentJob,
        data: { ...noEnrichmentJob.data, extractAttributes: false },
      };

      const result = await processTranslateJob(jobWithoutAttributes);

      expect(result.attributes).toBeUndefined();
    });
  });
});
