import { ObjectId } from 'mongodb';
export enum modeType {
  Bookings = 'Bookings',
  ShopWiseOrder = 'ShopWiseOrder',
  Order = 'Order',
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
