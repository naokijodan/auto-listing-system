// Types for Joom API v3 Products domain
// Money is a string type (imported alias)

import type { Money, JoomId, ImageBundleWithState } from '../shared-types';

// ProductAttribute
export interface ProductAttribute {
  key: string;
  value: string;
}

// ProductCategory
export interface ProductCategory {
  id?: string;
  name?: string;
  parentId?: string;
  path?: string;
}

// CategoryWithTakeRate (for Get Categories endpoint)
export interface CategoryWithTakeRate {
  id?: string;
  name?: string;
  parentId?: string;
  path?: string;
  takeRate?: number;
}

// ProductDangerInfo
export type DangerKind =
  | 'adult'
  | 'aerosoleAndGases'
  | 'battery'
  | 'dangerousChemicals'
  | 'flammable'
  | 'hair'
  | 'highDensity'
  | 'liquid'
  | 'lookAlikeWeapon'
  | 'magnets'
  | 'perfumes'
  | 'plants'
  | 'powder'
  | 'semiLiquid'
  | 'sharp'
  | 'teaLeafs'
  | 'weaponAccessories'
  | 'withBattery';

export interface ProductDangerInfo {
  isDangerous: boolean;
  dangerKinds?: DangerKind[];
}

// ProductParsedAttribute
export interface ProductParsedAttribute {
  key?: string;
  values?: Array<{ text?: string }>;
}

// ProductPriceRange
export interface ProductPriceRange {
  min?: Money;
  max?: Money;
}

// ProductShipmentScoreInfo
export interface ProductShipmentScoreInfo {
  score?: number;
  scoreType?: 'slow';
}

// ProductCustomisation
export interface ProductCustomisationPosition {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface ProductCustomisation {
  type: 'image' | 'text';
  image?: ImageBundleWithState;
  position?: ProductCustomisationPosition;
}

// ProductTakeRates
export interface ProductTakeRates {
  default?: number;
  fbj?: number;
  increased?: number;
}

// ClusterTierMetricScores
export interface ClusterTierMetricScores {
  priceScore?: number;
  fftimeScore?: number;
  qualityScore?: number;
  cancelRateScore?: number;
}

// ClusterTierInfo
export interface ClusterTierInfo {
  score?: number;
  metricScores?: ClusterTierMetricScores;
  worstMetricName?: 'price';
}

// ProductRating
export interface ProductRating {
  average?: number;
  count?: number;
}

// ProductReviewInfraction
export interface ProductReviewInfraction {
  brandId?: string;
  code?: string;
  dangerInfoByJoom?: unknown;
  description?: string;
  diagnoseTimestamp?: string;
  duplicateProductId?: string;
  index?: string;
  indexEnd?: number;
  isPermanent?: boolean;
  kind?: 'blocker';
  merchantPromotionId?: string;
  metric?: number;
  note?: string;
  platformPromotionId?: string;
  variantId?: string;
  variantSku?: string;
  where?: string;
}

// ProductReview
export interface ProductReview {
  infractions?: ProductReviewInfraction[];
}

// ProductRichContentItem
export interface ProductRichContentItem {
  images?: ImageBundleWithState[];
  language?: string;
}

// ProductState
export type ProductState =
  | 'active'
  | 'archived'
  | 'disabledByJoom'
  | 'disabledByMerchant'
  | 'locked'
  | 'pending'
  | 'rejected'
  | 'warning';

// ProductContentScore
export type ProductContentScore = 'full' | 'fair' | 'poor';

// ProductFlag
export type ProductFlag = 'edlp' | 'edlpCompetitivePrice' | 'edlpFavorablePrice';

// ProductVariant
export interface ProductVariant {
  id?: string;
  attributes?: ProductAttribute[];
  colors?: string;
  currency?: 'USD';
  declaredValue?: Money;
  gtin?: string;
  hsCode?: string;
  mainImage?: ImageBundleWithState;
  msrPrice?: Money;
  parsedAttributes?: ProductParsedAttribute[];
  price?: Money;
  averageSalesPrice?: Money;
  salesPrice?: Money;
  productId?: string;
  shippingHeight?: number;
  shippingLength?: number;
  shippingWeight?: number;
  shippingWidth?: number;
  size?: string;
  sku?: string;
  committedFulfillmentDays?: number;
  effectiveStock?: number;
  enabled?: boolean;
  inventory?: number;
  salePrice?: Money;
  shippingPrice?: Money;
  joomSelectPrice?: Money;
  joomSelectTargetPrice?: Money;
}

// Product (main response type)
export interface Product {
  id: string;
  attributes?: ProductAttribute[];
  category?: ProductCategory;
  categoryByJoom?: ProductCategory;
  dangerInfo?: ProductDangerInfo;
  dangerKind?: string; // deprecated
  description?: string;
  extraImages?: ImageBundleWithState[];
  landingPageUrl?: string;
  mainImage: ImageBundleWithState;
  name: string;
  parsedAttributes?: ProductParsedAttribute[];
  sku: string;
  storeId?: string;
  takeRate?: number;
  takeRates?: ProductTakeRates;
  tags?: string[];
  contentScore?: ProductContentScore;
  shipmentScoreInfo?: ProductShipmentScoreInfo;
  customisation?: ProductCustomisation;
  brand?: string;
  enabled: boolean;
  flags?: ProductFlag[];
  hasActiveVersion: boolean;
  isInCluster?: boolean;
  joomSelectPrice?: ProductPriceRange;
  joomSelectTargetPrice?: ProductPriceRange;
  clusterTierInfo?: ClusterTierInfo;
  isPromoted?: boolean;
  rating?: ProductRating;
  review: ProductReview;
  richContent?: ProductRichContentItem[];
  saleEndDate?: string;
  saleStartDate?: string;
  state: ProductState;
  updateTimestamp: string;
  uploadTimestamp: string;
  variants: ProductVariant[];
}

// Request types

// CreateProductVariantInput
export interface CreateProductVariantInput {
  attributes?: ProductAttribute[];
  color?: string;
  currency?: 'USD';
  declaredValue?: Money;
  gtin?: string;
  hsCode?: string;
  inventory?: number;
  mainImage?: string; // URL string for create
  msrPrice?: Money;
  price: Money; // required
  salePrice?: Money;
  shippingHeight?: number;
  shippingLength?: number;
  shippingPrice?: Money;
  shippingWeight?: number;
  shippingWidth?: number;
  size?: string;
  sku: string; // required
  committedFulfillmentDays?: number;
}

// CreateProductInput
export interface CreateProductInput {
  attributes?: ProductAttribute[];
  categoryId?: string;
  customisation?: {
    type: 'image' | 'text';
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    position: ProductCustomisationPosition;
  };
  dangerInfo?: ProductDangerInfo;
  description?: string;
  enabled?: boolean;
  extraImages?: string[];
  landingPageUrl?: string;
  mainImage: string; // required URL
  name: string; // required
  richContent?: Array<{ imageUrls: string[]; language: string }>;
  saleEndDate?: string;
  saleStartDate?: string;
  sku: string; // required
  storeId?: string;
  tags?: string[];
  variants: CreateProductVariantInput[]; // required
  brand?: string;
}

// UpdateProductVariantInput
export interface UpdateProductVariantInput {
  attributes?: ProductAttribute[];
  color?: string;
  currency?: 'USD';
  declaredValue?: Money;
  gtin?: string;
  hsCode?: string;
  inventory?: number;
  mainImage?: string;
  msrPrice?: Money;
  price: Money; // required
  salePrice?: Money;
  shippingHeight?: number;
  shippingLength?: number;
  shippingPrice?: Money;
  shippingWeight?: number;
  shippingWidth?: number;
  size?: string;
  sku: string; // required
  committedFulfillmentDays?: number;
}

// UpdateProductInput
export interface UpdateProductInput {
  attributes?: ProductAttribute[];
  categoryId?: string;
  customisation?: {
    type: 'image' | 'text';
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    position?: ProductCustomisationPosition;
  };
  dangerInfo?: ProductDangerInfo;
  description?: string;
  enabled?: boolean;
  extraImages?: string[];
  landingPageUrl?: string;
  mainImage?: string;
  name?: string;
  richContent?: Array<{ imageUrls: string[]; language: string }>;
  saleEndDate?: string;
  saleStartDate?: string;
  storeId?: string;
  tags?: string[];
  variants?: UpdateProductVariantInput[];
  brand?: string;
}

// RemoveProductInput
export interface RemoveProductInput {
  reason?: 'legalRequirement' | 'stopSelling';
}

// RemoveVariantsInput
export interface RemoveVariantsInput {
  variants: Array<{ id?: string; sku?: string }>;
}

// GenerateEuLabelsInput
export interface GenerateEuLabelsInput {
  productId: string;
  variantIds?: string[];
}

// ColorWithName
export interface ColorWithName {
  name?: string;
  rgb?: string;
}

// CategoryRequirements
export interface CategoryAttributeRequirement {
  attributeId?: string;
  attributeName?: string;
  badDescriptionSamples?: string[];
  goodDescriptionSamples?: string[];
  severity?: 'optional' | string;
  supportedKeys?: string[];
  supportedSources?: string[];
}

export interface CategoryRequirements {
  attributeRequirements?: CategoryAttributeRequirement[];
  id: string;
}

// CategoryAttributeValues
export interface CategoryAttributeValues {
  attributeName: string;
  attributeValues: string[];
}

// JoomSelectProposal (shared for approved/pending/removed)
export interface JoomSelectProposal {
  // Contains full Product structure
  [key: string]: unknown;
}

