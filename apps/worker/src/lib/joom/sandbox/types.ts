import { JoomId, Money } from '../shared-types';

export interface CreateSandboxOrderInput {
  productId: JoomId;
  variantId: JoomId;
  quantity?: number;
  price?: Money;
  shippingPrice?: Money;
}

export interface ApproveSandboxProductInput {
  id: JoomId;
}

export interface CategorizeSandboxProductInput {
  id: JoomId;
  categoryId: JoomId;
}

export interface SandboxOrder {
  id: JoomId;
  [key: string]: unknown;
}

export interface SandboxProductResult {
  id: JoomId;
  [key: string]: unknown;
}

