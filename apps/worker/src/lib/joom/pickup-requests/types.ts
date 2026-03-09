import { JoomId } from '../shared-types';

export interface PickupRequestPayload {
  boxesCount: number;
  boxesTotalWeight: number;
  pickupAddressId: JoomId;
}

export interface CreatePickupRequestInput {
  type: 'default' | 'fbj';
  payload: PickupRequestPayload;
}

export interface PickupRequest {
  id: JoomId;
  type?: string;
  status?: string;
  payload?: PickupRequestPayload;
  createdAt?: string;
  updatedAt?: string;
}

export interface PickupBox {
  id: JoomId;
  barcode?: string;
  status?: string;
}

