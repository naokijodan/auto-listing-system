import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  TranslationPromptSchema,
  PromptsResponseSchema,
  type TranslationPrompt,
} from '../types';

function makePrompt(overrides: Partial<TranslationPrompt> = {}): TranslationPrompt {
  return {
    id: 'p1',
    name: 'Watch JP→EN',
    category: 'Watches',
    marketplace: null,
    systemPrompt: 'You are a translator',
    userPrompt: 'Translate: {{title}} {{description}}',
    extractAttributes: ['brand', 'model'],
    additionalInstructions: null,
    seoKeywords: ['vintage', 'rare'],
    priority: 10,
    isActive: true,
    isDefault: false,
    createdAt: new Date().toISOString(),
    _count: { templates: 0 },
    ...overrides,
  };
}

describe('TranslationPromptSchema', () => {
  it('validates a correct prompt', () => {
    const prompt = makePrompt();
    const res = TranslationPromptSchema.safeParse(prompt);
    expect(res.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const bad = { ...makePrompt(), name: undefined } as unknown;
    const res = TranslationPromptSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('allows nullable category and marketplace', () => {
    const prompt = makePrompt({ category: null, marketplace: null });
    const res = TranslationPromptSchema.safeParse(prompt);
    expect(res.success).toBe(true);
  });

  it('requires arrays for attributes and keywords', () => {
    const bad = { ...makePrompt(), extractAttributes: 'brand' as unknown as string[] };
    const res = TranslationPromptSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('accepts optional _count with templates number', () => {
    const prompt = makePrompt({ _count: { templates: 3 } });
    const res = TranslationPromptSchema.safeParse(prompt);
    expect(res.success).toBe(true);
  });

  it('rejects wrong _count shape', () => {
    const bad = { ...makePrompt(), _count: { templates: 'x' } as unknown };
    const res = TranslationPromptSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });
});

describe('PromptsResponseSchema', () => {
  it('validates a correct response with array', () => {
    const data = { data: [makePrompt(), makePrompt({ id: 'p2' })] };
    const res = PromptsResponseSchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.data.length).toBe(2);
    }
  });

  it('rejects when data is not an array', () => {
    const bad = { data: makePrompt() } as unknown;
    const res = PromptsResponseSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('rejects when items do not match prompt schema', () => {
    const badItem = { ...makePrompt(), id: 123 } as unknown;
    const res = PromptsResponseSchema.safeParse({ data: [badItem] });
    expect(res.success).toBe(false);
  });
});

