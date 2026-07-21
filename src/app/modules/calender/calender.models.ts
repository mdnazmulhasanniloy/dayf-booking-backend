import { model, Schema, ObjectId, Types } from 'mongoose';
import {
  CALENDAR_BLOCK_TYPE,
  ICalender,
  ICalenderModules,
} from './calender.interface';
import { BOOKING_MODEL_TYPE } from '../bookings/bookings.interface';
import moment from 'moment';

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
    expireAt: {
      type: Date,
      default: () => {
        const expireAt = new Date();
        expireAt.setMinutes(expireAt.getMinutes() + 5);
        return expireAt;
      },
    },
  },
  {
    timestamps: true,
  },
);

calenderSchema.pre('save', function (next) {
  if (!this.date) {
    return next(new Error('Date is required'));
  }

  this.date = moment(this.date).utc().toDate();

  next();
});
calenderSchema.index({ reference: 1, modelType: 1, date: 1 }, { unique: true });
calenderSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const Calender = model<ICalender, ICalenderModules>('Calender', calenderSchema);
export default Calender;
