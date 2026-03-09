import type { Money } from '../shared-types';

export interface VariantShippingDestination {
  country: string;
  currency?: string;
  disabled?: boolean;
  shippingPrice?: Money;
  variantId?: string;
  variantSku?: string;
  warehouseId?: string;
  warehouseLabel?: string;
}

export interface ProductShippingDestination {
  country: string;
  currency?: string;
  disabled?: boolean;
  shippingPrice?: Money;
  tierType?: 'default' | 'fast';
  warehouseId?: string;
  warehouseLabel?: string;
}

export interface UpdateVariantDestinationItem {
  country: string;
  currency?: string;
  disabled?: boolean;
  shippingPrice?: Money;
  variantId?: string;
  variantSku?: string;
  warehouseId?: string;
  warehouseLabel?: string;
}

export interface UpdateProductDestinationItem {
  country: string;
  currency?: string;
  disabled?: boolean;
  shippingPrice?: Money;
  tierType?: 'default' | 'fast';
  warehouseId?: string;
  warehouseLabel?: string;
}

export interface RemoveVariantDestinationItem {
  country: string;
  variantId?: string;
  variantSku?: string;
  warehouseId?: string;
  warehouseLabel?: string;
}

export interface RemoveProductDestinationItem {
  country: string;
  warehouseId?: string;
  warehouseLabel?: string;
}

