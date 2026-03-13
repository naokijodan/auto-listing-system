import { z } from 'zod';

// TypeScript Interfaces
export interface Template {
  id: string;
  name: string;
  description: string | null;
  categoryMappingId: string | null;
  translationPromptId: string | null;
  profitRate: number;
  minProfit: number;
  titleTemplate: string | null;
  descriptionTemplate: string | null;
  conditionMapping: Record<string, string>;
  defaultWeight: number | null;
  defaultShippingDays: string | null;
  isActive: boolean;
  createdAt: string;
  categoryMapping?: {
    id: string;
    sourceCategory: string;
    ebayCategoryName: string;
  } | null;
  translationPrompt?: {
    id: string;
    name: string;
  } | null;
}

export interface Category {
  id: string;
  sourceCategory: string;
  ebayCategoryName: string;
}

export interface Prompt {
  id: string;
  name: string;
}

// Zod Schemas
export const CategorySchema = z.object({
  id: z.string(),
  sourceCategory: z.string(),
  ebayCategoryName: z.string(),
});

export const PromptSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categoryMappingId: z.string().nullable(),
  translationPromptId: z.string().nullable(),
  profitRate: z.number(),
  minProfit: z.number(),
  titleTemplate: z.string().nullable(),
  descriptionTemplate: z.string().nullable(),
  conditionMapping: z.record(z.string()),
  defaultWeight: z.number().nullable(),
  defaultShippingDays: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  categoryMapping: z
    .object({
      id: z.string(),
      sourceCategory: z.string(),
      ebayCategoryName: z.string(),
    })
    .nullable()
    .optional(),
  translationPrompt: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
});

export const TemplatesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(TemplateSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }).optional(),
});

export type TemplateType = z.infer<typeof TemplateSchema>;
export type TemplatesResponse = z.infer<typeof TemplatesResponseSchema>;

