import { z } from 'zod';

// Domain interfaces
export interface CategoryMapping {
  id: string;
  sourceCategory: string;
  ebayCategoryId: string;
  ebayCategoryName: string;
  itemSpecifics: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { templates: number };
}

export interface CategoriesApiResponse {
  success: boolean;
  data: CategoryMapping[];
  pagination: { total: number; limit: number; offset: number };
}

// Zod Schemas
export const CategoryMappingSchema = z.object({
  id: z.string(),
  sourceCategory: z.string(),
  ebayCategoryId: z.string(),
  ebayCategoryName: z.string(),
  itemSpecifics: z.record(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z
    .object({
      templates: z.number(),
    })
    .optional(),
});

export const PaginationSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const CategoriesApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(CategoryMappingSchema),
  pagination: PaginationSchema,
});

export type CategoryMappingType = z.infer<typeof CategoryMappingSchema>;
export type CategoriesApiResponseType = z.infer<typeof CategoriesApiResponseSchema>;

