import { model, Schema, ObjectId, Types } from 'mongoose';
import { CALENDAR_BLOCK_TYPE, ICalender, ICalenderModules } from './calender.interface';
import { BOOKING_MODEL_TYPE } from '../bookings/bookings.interface';

const calenderSchema = new Schema<ICalender>(
  {
    reference: { type: Types.ObjectId, required: true, refPath: 'modelType' },
    modelType: {
      type: String,
      enum: Object.values(BOOKING_MODEL_TYPE),
      required: true,
    },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: Object.values(CALENDAR_BLOCK_TYPE),
      required: true,
    },
    bookingId: { type: Types.ObjectId, ref: 'Bookings', default: null },
    blockedBy: { type: Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, default: null },
    expireAt: { type: Date, default: null }, 
  },
  {
    timestamps: true,
  },
);

calenderSchema.index({ reference: 1, modelType: 1, date: 1 }, { unique: true });
calenderSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });


const Calender = model<ICalender, ICalenderModules>('Calender', calenderSchema);
export default Calender;
