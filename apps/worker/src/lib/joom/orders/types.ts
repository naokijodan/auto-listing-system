import type { Money } from '../shared-types';

export interface OrderPriceInfo {
  cost: Money;
  costBeforeDiscount?: Money;
  insuranceFee?: Money;
  price: Money;
  productPriceBeforeDiscount?: Money;
  shipping: Money;
  shippingBeforeDiscount?: Money;
  taxAmount?: Money;
  totalCost: Money;
}

export interface OrderShippingAddress {
  city?: string;
  country?: string;
  name?: string;
  phone?: string;
  postalCode?: string;
  state?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  zipCode?: string;
}

export interface OrderProduct {
  id: string;
  name: string;
  sku?: string;
  mainImage?: string;
  variantId?: string;
  variantSku?: string;
  color?: string;
  size?: string;
}

export interface OrderShipment {
  provider?: string;
  providerId?: string;
  trackingNumber?: string;
  shipperName?: string;
  shippingOrderNumber?: string;
}

export interface OrderShippingOption {
  name?: string;
  id?: string;
}

export interface OrderRefund {
  reason?: string;
  note?: string;
  amount?: Money;
}

export interface OrderReturn {
  status?: string;
  reason?: string;
}

export interface OrderGiftProduct {
  id?: string;
  name?: string;
  quantity?: number;
}

export interface Order {
  id: string;
  currency: string;
  daysToFulfill?: number;
  fulfillTimeHours?: number;
  hoursToFulfill?: number;
  allowedShippingTypes?: 'offlineOnly' | 'offlineOrOnline' | 'onlineOnly';
  onlineShippingRequirement?: string;
  orderTimestamp: string;
  priceInfo: OrderPriceInfo;
  product: OrderProduct;
  giftProduct?: OrderGiftProduct;
  quantity: number;
  refund?: OrderRefund;
  return?: OrderReturn;
  reviewRating?: number;
  shipment?: OrderShipment;
  shippingAddress: OrderShippingAddress;
  shippingAddressNative: OrderShippingAddress;
  shippingAddressHash: string;
  shippingOption?: OrderShippingOption;
  status: 'approved' | 'cancelled' | 'fulfilledOnline' | 'paidByJoomRefund' | 'refunded' |
          'returnArrived' | 'returnCompleted' | 'returnDeclined' | 'returnExpired' |
          'returnInitiated' | 'shipped';
  isFbj?: boolean;
  storeId: string;
  transactionId?: string;
  updateTimestamp: string;
  canBeConsolidated?: boolean;
  isFulfillmentAllowed?: boolean;
  fulfillmentAllowedTimestamp?: string;
}

export interface CancelOrderInput {
  reason?: 'outOfStock' | 'unableToFulfill';
  note?: string;
}

export interface FulfillOrderInput {
  provider?: string;
  providerId?: string;
  trackingNumber: string;
}

export interface FulfillOnlineOrderParam {
  id?: string;
  imeis?: string[];
}

export interface FulfillOnlineInvoiceInfo {
  date: string;
  link: string;
  number: string;
}

export interface FulfillOnlineInput {
  ids: string[];
  onlineInvoiceInfo?: FulfillOnlineInvoiceInfo;
  orderParams?: FulfillOnlineOrderParam[];
  pickup?: boolean;
  pickupAddressId?: string;
}

export interface FulfillOnlineResult {
  shipperName: string;
  shippingOrderNumber: string;
  trackingNumber: string;
}

export interface ModifyTrackingInput {
  provider?: string;
  providerId?: string;
  trackingNumber: string;
}

export interface ShippingProvider {
  id?: string;
  name?: string;
}

