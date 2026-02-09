import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions
const { mockCreate, mockFindFirst, mockFindMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    translationPrompt: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
    },
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

describe('OpenAI Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    mockFindFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('translateProduct', () => {
    it('should return placeholder when API key not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const { translateProduct } = await import('../../lib/openai');

      const result = await translateProduct('テスト商品', 'これはテストです');

      expect(result.titleEn).toBe('[EN] テスト商品');
      expect(result.descriptionEn).toBe('[EN] これはテストです');
      expect(result.tokensUsed).toBe(0);
    });

    it('should translate product successfully', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                titleEn: 'Test Product',
                descriptionEn: 'This is a test',
                attributes: {
                  brand: 'TestBrand',
                  condition: 'new',
                },
              }),
            },
          },
        ],
        usage: {
          total_tokens: 150,
        },
      });

      const { translateProduct } = await import('../../lib/openai');

      const result = await translateProduct('テスト商品', 'これはテストです');

      expect(result.titleEn).toBe('Test Product');
      expect(result.descriptionEn).toBe('This is a test');
      expect(result.attributes?.brand).toBe('TestBrand');
      expect(result.tokensUsed).toBe(150);
    });

    it('should use category-specific prompt', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockFindFirst.mockResolvedValueOnce({
        systemPrompt: 'You are a watch expert translator.',
        userPrompt: 'Translate this watch: {{title}}\n{{description}}',
        extractAttributes: ['brand', 'model', 'movement', 'caseSize'],
        additionalInstructions: 'Focus on technical specifications',
      });

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                titleEn: 'Seiko Watch',
                descriptionEn: 'Automatic movement',
              }),
            },
          },
        ],
        usage: { total_tokens: 100 },
      });

      const { translateProduct } = await import('../../lib/openai');

      await translateProduct('セイコー時計', '自動巻き', {
        category: 'watches',
      });

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'watches',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const { translateProduct } = await import('../../lib/openai');

      const result = await translateProduct('テスト', 'テスト説明');

      expect(result.titleEn).toBe('[EN] テスト');
      expect(result.tokensUsed).toBe(0);
    });

    it('should handle empty response', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const { translateProduct } = await import('../../lib/openai');

      const result = await translateProduct('テスト', 'テスト説明');

      expect(result.titleEn).toBe('[EN] テスト');
    });

    it('should skip attribute extraction when disabled', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                titleEn: 'Simple Title',
                descriptionEn: 'Simple Description',
              }),
            },
          },
        ],
        usage: { total_tokens: 50 },
      });

      const { translateProduct } = await import('../../lib/openai');

      const result = await translateProduct('シンプル', 'シンプル説明', {
        extractAttributes: false,
      });

      expect(result.titleEn).toBe('Simple Title');
      expect(result.attributes).toBeUndefined();
    });

    it('should use marketplace-specific prompt when category prompt not found', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // First call: category search - not found
      mockFindFirst.mockResolvedValueOnce(null);
      // Second call: marketplace search - found
      mockFindFirst.mockResolvedValueOnce({
        systemPrompt: 'Joom marketplace translator',
        userPrompt: 'Translate: {{title}} - {{description}}',
        extractAttributes: ['brand'],
      });

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                titleEn: 'Joom Product',
                descriptionEn: 'Joom Description',
              }),
            },
          },
        ],
        usage: { total_tokens: 80 },
      });

      const { translateProduct } = await import('../../lib/openai');

      await translateProduct('Joom商品', 'Joom説明', {
        marketplace: 'joom',
      });

      expect(mockFindFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('isOpenAIConfigured', () => {
    it('should return true when API key is set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const { isOpenAIConfigured } = await import('../../lib/openai');

      expect(isOpenAIConfigured()).toBe(true);
    });

    it('should return false when API key is not set', async () => {
      delete process.env.OPENAI_API_KEY;

      const { isOpenAIConfigured } = await import('../../lib/openai');

      expect(isOpenAIConfigured()).toBe(false);
    });
  });

  describe('getAvailablePrompts', () => {
    it('should return active prompts sorted by priority', async () => {
      const mockPrompts = [
        { id: '1', name: 'Prompt A', priority: 10, isActive: true },
        { id: '2', name: 'Prompt B', priority: 5, isActive: true },
      ];
      mockFindMany.mockResolvedValueOnce(mockPrompts);

      const { getAvailablePrompts } = await import('../../lib/openai');

      const result = await getAvailablePrompts();

      expect(result).toEqual(mockPrompts);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
    });
  });

  describe('translateProduct with seoKeywords', () => {
    it('should translate product with SEO keywords option', async () => {
      process.env.OPENAI_API_KEY = 'test-api-key';

      // Mock custom prompt with SEO keywords handling
      mockFindFirst.mockResolvedValueOnce({
        systemPrompt: 'You are an SEO translator.',
        userPrompt: 'Translate: {{title}} - {{description}}',
        seoKeywords: ['vintage', 'watch'],
        extractAttributes: ['brand'],
      });

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                titleEn: 'SEO Optimized Product',
                descriptionEn: 'SEO description with keywords',
              }),
            },
          },
        ],
        usage: { total_tokens: 120 },
      });

      const { translateProduct } = await import('../../lib/openai');

      const result = await translateProduct('ヴィンテージ時計', '古い時計の説明', {
        category: 'vintage_watches',
        seoKeywords: ['vintage', 'watch', 'antique'],
      });

      expect(result.titleEn).toBe('SEO Optimized Product');
      expect(result.descriptionEn).toBe('SEO description with keywords');
    });
  });

});
