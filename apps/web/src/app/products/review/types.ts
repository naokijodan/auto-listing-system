import { z } from 'zod';

// Zod schemas
export const JoomPreviewProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleEn: z.string().optional(),
  price: z.number(),
  status: z.string(),
});

export const JoomPreviewJoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  mainImage: z.string(),
  extraImages: z.array(z.string()),
  price: z.number(),
  currency: z.string(),
  quantity: z.number(),
  shipping: z.object({ price: z.number(), time: z.string() }),
  tags: z.array(z.string()),
  parentSku: z.string(),
  sku: z.string(),
});

export const JoomPreviewPricingSchema = z.object({
  originalPriceJpy: z.number(),
  costUsd: z.number(),
  shippingCost: z.number(),
  platformFee: z.number(),
  paymentFee: z.number(),
  profit: z.number(),
  finalPriceUsd: z.number(),
  exchangeRate: z.number(),
});

export const JoomPreviewValidationSchema = z.object({
  passed: z.boolean(),
  warnings: z.array(z.string()),
});

export const JoomPreviewSeoSchema = z.object({
  score: z.number(),
  estimatedVisibility: z.enum(['high', 'medium', 'low']),
});

export const JoomPreviewDataSchema = z.object({
  product: JoomPreviewProductSchema,
  joomPreview: JoomPreviewJoomSchema,
  pricing: JoomPreviewPricingSchema,
  validation: JoomPreviewValidationSchema,
  seo: JoomPreviewSeoSchema,
});

export type JoomPreviewData = z.infer<typeof JoomPreviewDataSchema>;

