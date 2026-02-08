import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock Prisma
const { mockListingTemplate } = vi.hoisted(() => ({
  mockListingTemplate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('@rakuda/database', () => ({
  prisma: {
    listingTemplate: mockListingTemplate,
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
import { templatesRouter } from '../../routes/templates';
import { errorHandler } from '../../middleware/error-handler';

describe('Templates API', () => {
  let app: express.Application;

  const mockTemplate = {
    id: 'template-1',
    name: 'Electronics Template',
    description: 'Template for electronics',
    categoryMappingId: 'cat-1',
    translationPromptId: 'prompt-1',
    profitRate: 30,
    minProfit: 500,
    titleTemplate: '{{brand}} {{titleEn}}',
    descriptionTemplate: 'High quality {{condition}} item',
    conditionMapping: { NEW: 'Brand New', USED: 'Pre-owned' },
    defaultWeight: 1.0,
    defaultShippingDays: 3,
    isActive: true,
    categoryMapping: {
      id: 'cat-1',
      sourceCategory: 'Electronics',
      ebayCategoryName: 'Consumer Electronics',
    },
    translationPrompt: {
      id: 'prompt-1',
      name: 'Standard Prompt',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/templates', templatesRouter);
    app.use(errorHandler);
  });

  describe('GET /api/templates', () => {
    it('should return list of templates', async () => {
      mockListingTemplate.findMany.mockResolvedValue([mockTemplate]);
      mockListingTemplate.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by search query', async () => {
      mockListingTemplate.findMany.mockResolvedValue([mockTemplate]);
      mockListingTemplate.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/templates?search=Electronics');

      expect(response.status).toBe(200);
      expect(mockListingTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      mockListingTemplate.findMany.mockResolvedValue([mockTemplate]);
      mockListingTemplate.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/templates?isActive=true');

      expect(response.status).toBe(200);
      expect(mockListingTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockListingTemplate.findMany.mockResolvedValue([]);
      mockListingTemplate.count.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/templates?limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
      expect(response.body.pagination.total).toBe(50);
    });
  });

  describe('GET /api/templates/:id', () => {
    it('should return single template', async () => {
      mockListingTemplate.findUnique.mockResolvedValue(mockTemplate);

      const response = await request(app)
        .get('/api/templates/template-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('template-1');
    });

    it('should return 404 for non-existent template', async () => {
      mockListingTemplate.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/templates/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/templates', () => {
    it('should create new template', async () => {
      mockListingTemplate.create.mockResolvedValue(mockTemplate);

      const response = await request(app)
        .post('/api/templates')
        .send({
          name: 'Electronics Template',
          description: 'Template for electronics',
          profitRate: 30,
          minProfit: 500,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Electronics Template');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({
          description: 'Template without name',
        });

      expect(response.status).toBe(400);
    });

    it('should use default values for optional fields', async () => {
      mockListingTemplate.create.mockResolvedValue({
        ...mockTemplate,
        profitRate: 30,
        minProfit: 500,
        isActive: true,
      });

      const response = await request(app)
        .post('/api/templates')
        .send({ name: 'Minimal Template' });

      expect(response.status).toBe(201);
      expect(mockListingTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profitRate: 30,
            minProfit: 500,
            isActive: true,
          }),
        })
      );
    });
  });

  describe('PATCH /api/templates/:id', () => {
    it('should update template', async () => {
      mockListingTemplate.update.mockResolvedValue({
        ...mockTemplate,
        name: 'Updated Template',
      });

      const response = await request(app)
        .patch('/api/templates/template-1')
        .send({ name: 'Updated Template' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Template');
    });

    it('should partially update template', async () => {
      mockListingTemplate.update.mockResolvedValue({
        ...mockTemplate,
        profitRate: 40,
        minProfit: 1000,
      });

      const response = await request(app)
        .patch('/api/templates/template-1')
        .send({
          profitRate: 40,
          minProfit: 1000,
        });

      expect(response.status).toBe(200);
      expect(mockListingTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profitRate: 40,
            minProfit: 1000,
          }),
        })
      );
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('should delete template', async () => {
      mockListingTemplate.delete.mockResolvedValue(mockTemplate);

      const response = await request(app)
        .delete('/api/templates/template-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Template deleted');
    });
  });

  describe('POST /api/templates/:id/duplicate', () => {
    it('should duplicate template', async () => {
      mockListingTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockListingTemplate.create.mockResolvedValue({
        ...mockTemplate,
        id: 'template-2',
        name: 'Electronics Template (コピー)',
      });

      const response = await request(app)
        .post('/api/templates/template-1/duplicate');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toContain('コピー');
    });

    it('should duplicate with custom name', async () => {
      mockListingTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockListingTemplate.create.mockResolvedValue({
        ...mockTemplate,
        id: 'template-2',
        name: 'Custom Duplicate Name',
      });

      const response = await request(app)
        .post('/api/templates/template-1/duplicate')
        .send({ name: 'Custom Duplicate Name' });

      expect(response.status).toBe(201);
      expect(mockListingTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Custom Duplicate Name',
          }),
        })
      );
    });

    it('should return 404 for non-existent template', async () => {
      mockListingTemplate.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/templates/non-existent/duplicate');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/templates/:id/preview', () => {
    it('should preview template with product data', async () => {
      mockListingTemplate.findUnique.mockResolvedValue({
        ...mockTemplate,
        titleTemplate: '{{brand}} {{titleEn}}',
        descriptionTemplate: 'Condition: {{condition}}',
      });

      const response = await request(app)
        .post('/api/templates/template-1/preview')
        .send({
          productData: {
            title: 'テスト商品',
            titleEn: 'Test Product',
            brand: 'Sony',
            condition: 'NEW',
            price: 10000,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Sony Test Product');
      expect(response.body.data.description).toBe('Condition: NEW');
      expect(response.body.data.listingPrice).toBeDefined();
    });

    it('should calculate listing price based on profit settings', async () => {
      mockListingTemplate.findUnique.mockResolvedValue({
        ...mockTemplate,
        profitRate: 30,
        minProfit: 500,
      });

      const response = await request(app)
        .post('/api/templates/template-1/preview')
        .send({
          productData: {
            price: 1000,
          },
        });

      expect(response.status).toBe(200);
      // 1000 * 1.30 = 1300, or 1000 + 500 = 1500 -> max is 1500
      expect(response.body.data.listingPrice).toBe(1500);
    });

    it('should return 404 for non-existent template', async () => {
      mockListingTemplate.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/templates/non-existent/preview')
        .send({ productData: {} });

      expect(response.status).toBe(404);
    });

    it('should use condition mapping', async () => {
      mockListingTemplate.findUnique.mockResolvedValue({
        ...mockTemplate,
        conditionMapping: { NEW: 'Brand New', USED: 'Pre-owned' },
      });

      const response = await request(app)
        .post('/api/templates/template-1/preview')
        .send({
          productData: {
            condition: 'NEW',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.conditionMapped).toBe('Brand New');
    });
  });
});
