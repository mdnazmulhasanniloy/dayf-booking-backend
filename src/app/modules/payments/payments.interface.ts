import { Model, ObjectId } from 'mongoose';
import { IBookings } from '../bookings/bookings.interface';
import { IUser } from './../user/user.interface';

export type TPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export type TPaymentGateway = 'stripe' | 'chargily';

export type TCurrency = 'DZD' | 'EUR' | 'USD';

export interface IPayments {
  _id?: ObjectId | string;
  id: string;
  bookings: ObjectId | IBookings;
  redirectType: string;

  user: ObjectId | IUser;

  author: ObjectId | IUser;

  amount: number;

  currency: TCurrency;

  status: TPaymentStatus;

  tranId?: string;
  paidAt?: Date;

  paymentGateway?: TPaymentGateway;

  payment_method?: string;
  refundedAmount?: number;

  paymentIntentId?: string;
  refundReason?: string;

  isDeleted?: boolean;

  createdAt?: Date;

  updatedAt?: Date;

  isTransfer: boolean;
}

export type IPaymentsModules = Model<IPayments, Record<string, unknown>>;
