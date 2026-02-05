import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTranslateJob } from '../../processors/translate';
import { mockPrisma } from '../setup';

// Mock OpenAI module
vi.mock('../../lib/openai', () => ({
  isOpenAIConfigured: vi.fn(),
  translateProduct: vi.fn(),
}));

import { isOpenAIConfigured, translateProduct } from '../../lib/openai';

const mockIsOpenAIConfigured = vi.mocked(isOpenAIConfigured);
const mockTranslateProduct = vi.mocked(translateProduct);

describe('Translate Processor', () => {
  const mockJob = {
    id: 'job-123',
    data: {
      productId: 'product-1',
      title: 'テスト商品',
      description: 'これはテスト商品の説明です',
      extractAttributes: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.product.update.mockResolvedValue({ id: 'product-1' });
    mockPrisma.jobLog.create.mockResolvedValue({ id: 'log-1' });
  });

  describe('with OpenAI configured', () => {
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

      const result = await processTranslateJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.titleEn).toBe('Test Product');
      expect(result.descriptionEn).toBe('This is a test product description');
      expect(result.tokensUsed).toBe(150);
      expect(result.attributes).toBeDefined();
    });

    it('should update product status to PROCESSING then READY_TO_REVIEW', async () => {
      mockTranslateProduct.mockResolvedValue({
        titleEn: 'Test Product',
        descriptionEn: 'Test description',
        tokensUsed: 100,
      });

      await processTranslateJob(mockJob);

      // First update: PROCESSING
      expect(mockPrisma.product.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'product-1' },
        data: {
          translationStatus: 'PROCESSING',
          status: 'TRANSLATING',
        },
      });

      // Second update: COMPLETED
      expect(mockPrisma.product.update).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          where: { id: 'product-1' },
          data: expect.objectContaining({
            translationStatus: 'COMPLETED',
            status: 'READY_TO_REVIEW',
          }),
        })
      );
    });

    it('should create job log on success', async () => {
      mockTranslateProduct.mockResolvedValue({
        titleEn: 'Test Product',
        descriptionEn: 'Test description',
        tokensUsed: 100,
      });

      await processTranslateJob(mockJob);

      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-123',
          queueName: 'translate',
          jobType: 'TRANSLATE',
          status: 'COMPLETED',
          productId: 'product-1',
        }),
      });
    });

    it('should handle translation error', async () => {
      mockTranslateProduct.mockRejectedValue(new Error('OpenAI API error'));

      await expect(processTranslateJob(mockJob)).rejects.toThrow('OpenAI API error');

      // Verify error status update
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          translationStatus: 'ERROR',
          status: 'ERROR',
          lastError: 'OpenAI API error',
        }),
      });

      // Verify failed job log
      expect(mockPrisma.jobLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'OpenAI API error',
        }),
      });
    });
  });

  describe('without OpenAI configured', () => {
    beforeEach(() => {
      mockIsOpenAIConfigured.mockReturnValue(false);
    });

    it('should use placeholder translation', async () => {
      const result = await processTranslateJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.titleEn).toBe('[EN] テスト商品');
      expect(result.descriptionEn).toBe('[EN] これはテスト商品の説明です');
      expect(result.tokensUsed).toBe(0);
      expect(result.message).toContain('placeholder');
    });

    it('should include placeholder attributes when extractAttributes is true', async () => {
      const result = await processTranslateJob(mockJob);

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
        ...mockJob,
        data: {
          ...mockJob.data,
          extractAttributes: false,
        },
      };

      const result = await processTranslateJob(jobWithoutAttributes);

      expect(result.attributes).toBeUndefined();
    });
  });
});
