import { z } from 'zod';

export interface TranslationPrompt {
  id: string;
  name: string;
  category: string | null;
  marketplace: string | null;
  systemPrompt: string;
  userPrompt: string;
  extractAttributes: string[];
  additionalInstructions: string | null;
  seoKeywords: string[];
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  _count?: { templates: number };
}

export const TranslationPromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  marketplace: z.string().nullable(),
  systemPrompt: z.string(),
  userPrompt: z.string(),
  extractAttributes: z.array(z.string()),
  additionalInstructions: z.string().nullable(),
  seoKeywords: z.array(z.string()),
  priority: z.number(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  _count: z
    .object({
      templates: z.number(),
    })
    .optional(),
});

export const PromptsResponseSchema = z.object({
  data: z.array(TranslationPromptSchema),
});

export type PromptsResponse = z.infer<typeof PromptsResponseSchema>;

