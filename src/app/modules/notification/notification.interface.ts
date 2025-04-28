import { ObjectId } from 'mongodb';
export enum modeType {
  Bookings = 'Bookings',
  ShopWiseOrder = 'ShopWiseOrder',
  Order = 'Order',
  payments = 'Payments',
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
