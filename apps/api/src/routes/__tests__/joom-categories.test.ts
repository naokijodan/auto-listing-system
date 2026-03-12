import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';

// Hoisted mocks so we can control behavior per test
const { mockOpenAIChatCreate } = vi.hoisted(() => ({
  mockOpenAIChatCreate: vi.fn(),
}));

// Mock OpenAI client used by the route
vi.mock('openai', () => {
  class FakeOpenAI {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config: any) {}
    chat = {
      completions: {
        create: mockOpenAIChatCreate,
      },
    };
  }
  return { default: FakeOpenAI };
});

// Import after mocks
import joomCategoriesRouter from '../joom-categories';
import { mockPrisma } from '../../test/setup';

describe('Joom Categories Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();

    // Ensure model namespace exists on the mocked prisma
    // and reset per test
    (mockPrisma as any).joomCategoryMapping = {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    };

    app = express();
    app.use(express.json());
    app.use('/api/joom-categories', joomCategoriesRouter);
  });

  // Helper to get route handler directly from the router stack
  function getHandler(method: string, path: string): (req: any, res: any, next: any) => any {
    const stack: any[] = (joomCategoriesRouter as any).stack || [];
    const layer = stack.find((l: any) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]);
    if (!layer) throw new Error(`Handler not found for ${method} ${path}`);
    const routeStack = layer.route.stack || [];
    const handle = routeStack[0]?.handle;
    if (!handle) throw new Error(`No handle for ${method} ${path}`);
    return handle;
  }

  async function invoke(method: string, path: string, options: { body?: any; params?: any; query?: any } = {}) {
    const handler = getHandler(method, path);
    const req: any = {
      body: options.body || {},
      params: options.params || {},
      query: options.query || {},
    };
    return await new Promise<{ status: number; body: any }>((resolve) => {
      const res: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: any) {
          resolve({ status: this.statusCode, body: payload });
        },
      };
      handler(req, res, () => resolve({ status: res.statusCode || 200, body: undefined }));
    });
  }

  describe('PUT /api/joom-categories/mappings/:id validation', () => {
    it('allows updates with only whitelisted fields (success)', async () => {
      const updateSpy = (mockPrisma as any).joomCategoryMapping.update as ReturnType<typeof vi.fn>;
      updateSpy.mockResolvedValue({
        id: 'map-1',
        joomCategoryName: 'Watches',
        sourceKeywords: ['watch', 'seiko'],
        priority: 10,
        isActive: true,
      });

      const payload = {
        joomCategoryName: 'Watches',
        sourceKeywords: ['watch', 'seiko'],
        priority: 10,
        isActive: true,
      };

      const res = await invoke('put', '/mappings/:id', {
        params: { id: 'map-1' },
        body: payload,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Ensure prisma.update is called with only provided/allowed fields
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'map-1' },
          data: expect.objectContaining({
            joomCategoryName: 'Watches',
            sourceKeywords: ['watch', 'seiko'],
            priority: 10,
            isActive: true,
          }),
        })
      );
    });

    it('rejects unknown fields like id, createdAt with 400 ZodError', async () => {
      const res = await invoke('put', '/mappings/:id', {
        params: { id: 'map-1' },
        body: {
          id: 'should-not-allow',
          createdAt: new Date().toISOString(),
          joomCategoryName: 'Watches',
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation error');
    });

    it('rejects when sourceKeywords is a string (not array)', async () => {
      const res = await invoke('put', '/mappings/:id', {
        params: { id: 'map-1' },
        body: { sourceKeywords: 'not-array' },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation error');
    });

    it('rejects when priority is a decimal (must be int)', async () => {
      const res = await invoke('put', '/mappings/:id', {
        params: { id: 'map-1' },
        body: { priority: 1.5 },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation error');
    });
  });

  describe('POST /api/joom-categories/suggest AI fallback', () => {
    const baseProduct = {
      title: 'Smart Watch 40mm',
      description: 'A smart wearable watch',
      brand: 'Seiko',
    };

    it('returns success when confidence >= 0.7', async () => {
      (mockPrisma as any).joomCategoryMapping.findFirst.mockResolvedValue(null);
      (mockPrisma as any).joomCategoryMapping.create.mockResolvedValue({ id: 'map-1' });

      // Mock OpenAI response with high confidence
      mockOpenAIChatCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                categoryId: '1-1',
                confidence: 0.9,
                reasoning: 'High confidence match for Smartphones',
              }),
            },
          },
        ],
      });

      const res = await invoke('post', '/suggest', { body: baseProduct });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.suggestion).toBeDefined();
      expect(res.body.data.suggestion.joomCategoryId).toBe('1-1');
    });

    it('returns lowConfidence true with empty suggestions when confidence < 0.7', async () => {
      (mockPrisma as any).joomCategoryMapping.findFirst.mockResolvedValue(null);
      (mockPrisma as any).joomCategoryMapping.create.mockResolvedValue({ id: 'map-1' });

      // Mock OpenAI response with low confidence
      mockOpenAIChatCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                categoryId: '1-1',
                confidence: 0.6,
                reasoning: 'Not confident',
              }),
            },
          },
        ],
      });

      const res = await invoke('post', '/suggest', { body: baseProduct });

      expect(res.status).toBe(200);
      expect(res.body.lowConfidence).toBe(true);
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      expect(res.body.suggestions.length).toBe(0);
    });
  });
});
