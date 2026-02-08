import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Prisma
const { mockTranslationPrompt } = vi.hoisted(() => ({
  mockTranslationPrompt: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    translationPrompt: mockTranslationPrompt,
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Import after mocks
import { promptsRouter } from '../../routes/prompts';
import { errorHandler } from '../../middleware/error-handler';

describe('Prompts API', () => {
  let app: express.Application;

  const mockPrompt = {
    id: 'prompt-1',
    name: 'Electronics Prompt',
    category: 'Electronics',
    marketplace: 'eBay',
    systemPrompt: 'You are a professional translator...',
    userPrompt: 'Translate: {{title}} - {{description}}',
    extractAttributes: ['brand', 'model', 'condition'],
    additionalInstructions: 'Focus on accuracy',
    seoKeywords: ['electronics', 'gadgets'],
    priority: 10,
    isActive: true,
    isDefault: false,
    templates: [],
    _count: { templates: 2 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/prompts', promptsRouter);
    app.use(errorHandler);
  });

  describe('GET /api/prompts', () => {
    it('should return list of prompts', async () => {
      mockTranslationPrompt.findMany.mockResolvedValue([mockPrompt]);
      mockTranslationPrompt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/prompts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by search query', async () => {
      mockTranslationPrompt.findMany.mockResolvedValue([mockPrompt]);
      mockTranslationPrompt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/prompts?search=Electronics');

      expect(response.status).toBe(200);
      expect(mockTranslationPrompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should filter by category', async () => {
      mockTranslationPrompt.findMany.mockResolvedValue([mockPrompt]);
      mockTranslationPrompt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/prompts?category=Electronics');

      expect(response.status).toBe(200);
      expect(mockTranslationPrompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Electronics',
          }),
        })
      );
    });

    it('should filter by marketplace', async () => {
      mockTranslationPrompt.findMany.mockResolvedValue([mockPrompt]);
      mockTranslationPrompt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/prompts?marketplace=eBay');

      expect(response.status).toBe(200);
      expect(mockTranslationPrompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            marketplace: 'eBay',
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      mockTranslationPrompt.findMany.mockResolvedValue([mockPrompt]);
      mockTranslationPrompt.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/prompts?isActive=true');

      expect(response.status).toBe(200);
      expect(mockTranslationPrompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockTranslationPrompt.findMany.mockResolvedValue([]);
      mockTranslationPrompt.count.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/prompts?limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
      expect(response.body.pagination.total).toBe(50);
    });
  });

  describe('GET /api/prompts/:id', () => {
    it('should return single prompt', async () => {
      mockTranslationPrompt.findUnique.mockResolvedValue(mockPrompt);

      const response = await request(app)
        .get('/api/prompts/prompt-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('prompt-1');
    });

    it('should return 404 for non-existent prompt', async () => {
      mockTranslationPrompt.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/prompts/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/prompts', () => {
    it('should create new prompt', async () => {
      mockTranslationPrompt.create.mockResolvedValue(mockPrompt);

      const response = await request(app)
        .post('/api/prompts')
        .send({
          name: 'Electronics Prompt',
          systemPrompt: 'You are a professional translator...',
          userPrompt: 'Translate: {{title}} - {{description}}',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Electronics Prompt');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/prompts')
        .send({
          name: 'Incomplete Prompt',
        });

      expect(response.status).toBe(400);
    });

    it('should clear other defaults when isDefault is true', async () => {
      mockTranslationPrompt.updateMany.mockResolvedValue({ count: 1 });
      mockTranslationPrompt.create.mockResolvedValue({
        ...mockPrompt,
        isDefault: true,
      });

      const response = await request(app)
        .post('/api/prompts')
        .send({
          name: 'Default Prompt',
          systemPrompt: 'System prompt',
          userPrompt: 'User prompt',
          isDefault: true,
        });

      expect(response.status).toBe(201);
      expect(mockTranslationPrompt.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('PATCH /api/prompts/:id', () => {
    it('should update prompt', async () => {
      mockTranslationPrompt.update.mockResolvedValue({
        ...mockPrompt,
        name: 'Updated Prompt',
      });

      const response = await request(app)
        .patch('/api/prompts/prompt-1')
        .send({ name: 'Updated Prompt' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Prompt');
    });

    it('should clear other defaults when setting isDefault to true', async () => {
      mockTranslationPrompt.updateMany.mockResolvedValue({ count: 1 });
      mockTranslationPrompt.update.mockResolvedValue({
        ...mockPrompt,
        isDefault: true,
      });

      const response = await request(app)
        .patch('/api/prompts/prompt-1')
        .send({ isDefault: true });

      expect(response.status).toBe(200);
      expect(mockTranslationPrompt.updateMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'prompt-1' },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    });
  });

  describe('DELETE /api/prompts/:id', () => {
    it('should delete prompt', async () => {
      mockTranslationPrompt.delete.mockResolvedValue(mockPrompt);

      const response = await request(app)
        .delete('/api/prompts/prompt-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Translation prompt deleted');
    });
  });

  describe('POST /api/prompts/:id/test', () => {
    it('should return mock translation when OpenAI is not configured', async () => {
      mockTranslationPrompt.findUnique.mockResolvedValue(mockPrompt);

      const response = await request(app)
        .post('/api/prompts/prompt-1/test')
        .send({
          title: 'テスト商品',
          description: 'テスト説明',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.titleEn).toContain('[Mock]');
      expect(response.body.message).toContain('OpenAI API key not configured');
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/prompts/prompt-1/test')
        .send({
          description: 'テスト説明',
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent prompt', async () => {
      mockTranslationPrompt.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/prompts/non-existent/test')
        .send({
          title: 'テスト商品',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/prompts/:id/duplicate', () => {
    it('should duplicate prompt', async () => {
      mockTranslationPrompt.findUnique.mockResolvedValue(mockPrompt);
      mockTranslationPrompt.create.mockResolvedValue({
        ...mockPrompt,
        id: 'prompt-2',
        name: 'Electronics Prompt (コピー)',
        isDefault: false,
      });

      const response = await request(app)
        .post('/api/prompts/prompt-1/duplicate');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toContain('コピー');
    });

    it('should duplicate with custom name', async () => {
      mockTranslationPrompt.findUnique.mockResolvedValue(mockPrompt);
      mockTranslationPrompt.create.mockResolvedValue({
        ...mockPrompt,
        id: 'prompt-2',
        name: 'Custom Name',
      });

      const response = await request(app)
        .post('/api/prompts/prompt-1/duplicate')
        .send({ name: 'Custom Name' });

      expect(response.status).toBe(201);
      expect(mockTranslationPrompt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Custom Name',
            isDefault: false,
          }),
        })
      );
    });

    it('should return 404 for non-existent prompt', async () => {
      mockTranslationPrompt.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/prompts/non-existent/duplicate');

      expect(response.status).toBe(404);
    });
  });
});
