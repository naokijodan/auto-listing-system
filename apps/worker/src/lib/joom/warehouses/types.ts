import type { Money } from '../shared-types';

export interface Warehouse {
  id: string;
  country: string;
  destinationCountries?: string[];
  enabled: boolean;
  label: string;
  name: string;
  state?: 'archived' | 'blocked' | 'disabled' | 'enabled';
  tierInfo?: {
    warrantyDurationDays?: number;
  };
  type: 'fulfillmentService' | 'physical' | 'standardShipping';
}

export interface CreateWarehouseInput {
  country: string;
  destinationCountries?: string[];
  enabled: boolean;
  label: string;
  name: string;
}

export interface UpdateWarehouseInput {
  country?: string;
  destinationCountries?: string[];
  enabled?: boolean;
  label?: string;
  name?: string;
}

export interface WarehouseAvailability {
  currency?: string;
  inventory?: number;
  shippingPrice?: Money;
  variantId?: string;
  variantSku?: string;
  warehouseId?: string;
  warehouseLabel?: string;
}

export interface UpdateAvailabilityItem {
  currency?: string;
  inventory?: number;
  shippingPrice?: Money;
  variantId?: string;
  variantSku?: string;
  warehouseId?: string;
  warehouseLabel?: string;
}

