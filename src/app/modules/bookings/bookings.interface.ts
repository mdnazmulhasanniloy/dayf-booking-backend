import { Model, ObjectId } from 'mongoose';
export enum BOOKING_MODEL_TYPE {
  Apartment = 'Apartment',
  Rooms = 'Rooms',
}
export interface IBookings {
  _id?: ObjectId | string;
  id: string;
  modelType: string; 
  reference: ObjectId;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  tranId: string;
  author: ObjectId;
  user: ObjectId;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted: boolean;
}

export type IBookingsModules = Model<IBookings, Record<string, unknown>>;
