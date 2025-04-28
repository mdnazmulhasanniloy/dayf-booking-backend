import { Model, ObjectId } from 'mongoose';
import { IBookings } from '../bookings/bookings.interface';
import { IUser } from './../user/user.interface';

export interface IPayments {
  _id?: string;
  user: ObjectId | IUser;
  author: ObjectId | IUser;
  amount: number;
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
