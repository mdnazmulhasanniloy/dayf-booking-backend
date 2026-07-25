import { Model, ObjectId } from 'mongoose';
import { IRoomTypes } from './../roomTypes/roomTypes.interface';
import { IApartment } from '../apartment/apartment.interface';
import { IUser } from '../user/user.interface';
export enum BOOKING_MODEL_TYPE {
  Apartment = 'Apartment',
  Rooms = 'RoomTypes',
}
export interface IBookings {
  _id?: ObjectId | string;
  bookingCode: string;
  modelType: string;
  reference: ObjectId | IRoomTypes | IApartment;
  totalRooms: number;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  status: 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  tranId: string;
  author: ObjectId | IUser;
  user: ObjectId | IUser;
  additionalInfo: {
    name: string;
    phoneNumber: string;
  };
  depositAmount: number;
  remainingAmount: number;
  commissionRate: number;
  cancellationPolicySnapshot?: {
    depositRate: number;
    freeCancellationDays: number;
    refundProcessingHours: number;
    creditDelayMinBusinessDays: number;
    creditDelayMaxBusinessDays: number;
    listingBoostDays: number;
    noShowReportWindowHours: number;
    hostSuspensionDays: number;
    policyText: string;
  };
  guest: number;
  cancelReason: string;
  // currency: 'DZD' | 'USD';
  expireAt: Date;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted: boolean;
  isReviewed: boolean;
}

export type IBookingsModules = Model<IBookings, Record<string, unknown>>;
