import { JoomId } from '../shared-types';

export interface Document {
  id: JoomId;
  type?: string;
  status?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LinkProductsInput {
  documentId: JoomId;
  productIds: JoomId[];
}

export interface UnlinkProductsInput {
  documentId: JoomId;
  productIds: JoomId[];
}

export interface DocumentLink {
  documentId: JoomId;
  productId?: JoomId;
  productSku?: string;
  status?: string;
}

