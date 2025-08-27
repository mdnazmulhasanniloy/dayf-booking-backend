import { Model, ObjectId } from 'mongoose';
import { IBookings } from '../bookings/bookings.interface';
import { IUser } from './../user/user.interface';

export interface IPayments {
  redirectType: string;
  _id?: string;
  user: ObjectId | IUser;
  author: ObjectId | IUser;
  amount: number;
  receiptUrl: string;
  currency: string;
  status: string;
  paymentMethod: 'stripe';
  tranId: string;
  adminAmount: number;
  hotelOwnerAmount: number;
  isTransfer: boolean;
  bookings: ObjectId | IBookings;
  isDeleted: boolean;
}

export type IPaymentsModules = Model<IPayments, Record<string, unknown>>;
