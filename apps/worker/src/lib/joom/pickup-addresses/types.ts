import { JoomId } from '../shared-types';

export interface PickupAddressContact {
  name?: string;
  phone?: string;
}

export interface PickupAddress {
  id: JoomId;
  country?: string;
  city?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  zipcode?: string;
  state?: string;
  contact?: PickupAddressContact;
}

export interface CreatePickupAddressInput {
  country?: string;
  city?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  zipcode?: string;
  state?: string;
  contact?: PickupAddressContact;
}

export interface UpdatePickupAddressInput {
  country?: string;
  city?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  zipcode?: string;
  state?: string;
  contact?: PickupAddressContact;
}

