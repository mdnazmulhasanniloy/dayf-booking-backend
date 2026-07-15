import { ObjectId } from 'mongodb';
export enum modeType {
  Bookings = 'Bookings',
  Apartment = 'Apartment',
  ShopWiseOrder = 'ShopWiseOrder',
  Order = 'Order',
  payments = 'Payments',
  Supports = 'Supports',
}
export interface TNotification {
  receiver: ObjectId;
  message: string;
  description?: string;
  refference: ObjectId;
  model_type: modeType;
  date?: Date;
  read: boolean;
  isDeleted: boolean;
}
