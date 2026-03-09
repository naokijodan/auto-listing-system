import { JoomId } from '../shared-types';

export interface FbjReplenishment {
  id: JoomId;
  status?: string;
  forecastCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateForecastCountInput {
  id: JoomId;
  items: Array<{ variantId: JoomId; forecastCount: number }>;
}

export interface FbjInbound {
  id: JoomId;
  status?: string;
  pickupRequestId?: JoomId;
  pickupBoxBarcode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInboundInput {
  replenishmentId: JoomId;
  items: Array<{ variantId: JoomId; quantity: number }>;
}

export interface SplitReplenishmentInput {
  id: JoomId;
  items: Array<{ variantId: JoomId; count: number }>;
}

