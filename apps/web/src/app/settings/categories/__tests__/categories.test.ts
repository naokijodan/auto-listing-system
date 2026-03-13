import { describe, it, expect } from 'vitest';
import {
  CategoryMappingSchema,
  CategoriesApiResponseSchema,
  type CategoryMappingType,
} from '../types';

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

describe('CategoryMappingSchema', () => {
  it('validates a correct CategoryMapping', () => {
    const input = {
      id: '1',
      sourceCategory: '腕時計',
      ebayCategoryId: '31387',
      ebayCategoryName: 'Wristwatches',
      itemSpecifics: { Brand: 'Rolex', Condition: 'Used' },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _count: { templates: 2 },
    };
    const parsed = CategoryMappingSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value: CategoryMappingType = parsed.data;
      expect(value.itemSpecifics.Brand).toBe('Rolex');
    }
  });

  it('fails when required field is missing', () => {
    const input = {
      id: '1',
      // sourceCategory missing
      ebayCategoryId: '31387',
      ebayCategoryName: 'Wristwatches',
      itemSpecifics: {},
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown;
    const parsed = CategoryMappingSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('fails when itemSpecifics values are not strings', () => {
    const input = {
      id: '1',
      sourceCategory: '腕時計',
      ebayCategoryId: '31387',
      ebayCategoryName: 'Wristwatches',
      itemSpecifics: { Brand: 123 },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const parsed = CategoryMappingSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });
});

describe('CategoriesApiResponseSchema', () => {
  it('validates a correct response with pagination', () => {
    const input = {
      success: true,
      data: [
        {
          id: '1',
          sourceCategory: '腕時計',
          ebayCategoryId: '31387',
          ebayCategoryName: 'Wristwatches',
          itemSpecifics: { Brand: 'Rolex' },
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    };
    const parsed = CategoriesApiResponseSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it('fails without pagination object', () => {
    const input = {
      success: true,
      data: [],
      // pagination missing
    } as unknown;
    const parsed = CategoriesApiResponseSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('fails when data contains invalid mapping', () => {
    const input = {
      success: false,
      data: [
        {
          id: '1',
          sourceCategory: '腕時計',
          ebayCategoryId: '31387',
          ebayCategoryName: 'Wristwatches',
          itemSpecifics: { Brand: 123 }, // invalid
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, limit: 10, offset: 0 },
    };
    const parsed = CategoriesApiResponseSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it('accepts success=false as a valid boolean', () => {
    const input = {
      success: false,
      data: [],
      pagination: { total: 0, limit: 10, offset: 0 },
    };
    const parsed = CategoriesApiResponseSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });
});

describe('JSON parsing edge cases', () => {
  it('parses valid object JSON', () => {
    const text = '{"Brand":"Rolex","Condition":"Used"}';
    const parsed = safeJsonParse(text);
    expect(parsed).toBeTruthy();
    expect(parsed && (parsed as Record<string, string>).Brand).toBe('Rolex');
  });

  it('returns null for invalid JSON', () => {
    const text = '{invalid json}';
    const parsed = safeJsonParse(text);
    expect(parsed).toBeNull();
  });

  it('parses array JSON but fails schema for itemSpecifics', () => {
    const text = '["a","b"]';
    const parsed = safeJsonParse(text);
    expect(Array.isArray(parsed)).toBe(true);

    const mapping = {
      id: '1',
      sourceCategory: '腕時計',
      ebayCategoryId: '31387',
      ebayCategoryName: 'Wristwatches',
      itemSpecifics: parsed as unknown, // intentionally wrong shape
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = CategoryMappingSchema.safeParse(mapping);
    expect(result.success).toBe(false);
  });
});

