import { describe, it, expect } from 'vitest';
import {
  TemplateSchema,
  CategorySchema,
  PromptSchema,
  TemplatesResponseSchema,
  type Template,
} from '../types';

describe('TemplateSchema validation', () => {
  const base: Template = {
    id: 't1',
    name: '腕時計テンプレート',
    description: '説明',
    categoryMappingId: 'c1',
    translationPromptId: 'p1',
    profitRate: 30,
    minProfit: 500,
    titleTemplate: '{{titleEn}}',
    descriptionTemplate: '{{descriptionEn}}',
    conditionMapping: { '新品': 'New', '未使用に近い': 'Like New' },
    defaultWeight: 200,
    defaultShippingDays: '7-14 business days',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    categoryMapping: { id: 'c1', sourceCategory: '腕時計', ebayCategoryName: 'Wristwatches' },
    translationPrompt: { id: 'p1', name: 'Default' },
  };

  it('accepts a fully populated template', () => {
    const result = TemplateSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('accepts nullables and optionals correctly', () => {
    const minimal = {
      ...base,
      description: null,
      categoryMappingId: null,
      translationPromptId: null,
      titleTemplate: null,
      descriptionTemplate: null,
      defaultWeight: null,
      defaultShippingDays: null,
      categoryMapping: null,
      translationPrompt: null,
    };
    const result = TemplateSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const { id, ...rest } = base;
    // id is required, this should fail
    const result = TemplateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when conditionMapping values are not strings', () => {
    const invalid = {
      ...base,
      conditionMapping: { 新品: 1 as unknown as string },
    };
    const result = TemplateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('CategorySchema validation', () => {
  it('accepts a valid category', () => {
    const c = { id: 'c1', sourceCategory: '腕時計', ebayCategoryName: 'Wristwatches' };
    expect(CategorySchema.safeParse(c).success).toBe(true);
  });

  it('fails when a field is missing', () => {
    const c = { id: 'c1', sourceCategory: '腕時計' } as unknown;
    expect(CategorySchema.safeParse(c).success).toBe(false);
  });
});

describe('PromptSchema validation', () => {
  it('accepts a valid prompt', () => {
    const p = { id: 'p1', name: 'Default' };
    expect(PromptSchema.safeParse(p).success).toBe(true);
  });

  it('fails when name is not a string', () => {
    const p = { id: 'p1', name: 123 } as unknown;
    expect(PromptSchema.safeParse(p).success).toBe(false);
  });
});

describe('TemplatesResponseSchema validation', () => {
  const validTemplate: Template = {
    id: 't1',
    name: '腕時計テンプレート',
    description: null,
    categoryMappingId: null,
    translationPromptId: null,
    profitRate: 30,
    minProfit: 500,
    titleTemplate: null,
    descriptionTemplate: null,
    conditionMapping: {},
    defaultWeight: null,
    defaultShippingDays: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('parses a valid response with pagination', () => {
    const res = {
      success: true,
      data: [validTemplate],
      pagination: { total: 1, limit: 100, offset: 0 },
    };
    expect(TemplatesResponseSchema.safeParse(res).success).toBe(true);
  });

  it('parses success=false with valid structure', () => {
    const res = {
      success: false,
      data: [],
      pagination: { total: 0, limit: 100, offset: 0 },
    };
    expect(TemplatesResponseSchema.safeParse(res).success).toBe(true);
  });

  it('fails when data includes invalid template', () => {
    const res = {
      success: true,
      data: [
        {
          ...validTemplate,
          // invalid: profitRate must be number
          profitRate: '30',
        },
      ],
      pagination: { total: 1, limit: 100, offset: 0 },
    } as unknown;
    expect(TemplatesResponseSchema.safeParse(res).success).toBe(false);
  });
});

