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
  id: string;
  modelType: string;
  reference: ObjectId | IRoomTypes | IApartment;
  totalRooms: number;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  tranId: string;
  author: ObjectId | IUser;
  user: ObjectId | IUser;
  additionalInfo: {
    name: string;
    phoneNumber: string;
  };
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
