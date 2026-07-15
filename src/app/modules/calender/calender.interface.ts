import { Model, ObjectId } from 'mongoose';
import { BOOKING_MODEL_TYPE } from '../bookings/bookings.interface';

export enum CALENDAR_BLOCK_TYPE {
  booking = 'booking',
  manual = 'manual',
}
export interface ICalender {
  reference: ObjectId;  
  modelType: BOOKING_MODEL_TYPE;
  date: Date;
  type: CALENDAR_BLOCK_TYPE;
  bookingId?: ObjectId;
  blockedBy?: ObjectId;
  reason?: string;
  expireAt?: Date;
}

export type ICalenderModules = Model<ICalender, Record<string, unknown>>;
