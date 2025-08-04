import { model, Schema, Types } from 'mongoose';
import {
  BOOKING_MODEL_TYPE,
  IBookings,
  IBookingsModules,
} from './bookings.interface';
import generateCryptoString from '../../utils/generateCryptoString';
import { BOOKING_STATUS, PAYMENT_STATUS } from './bookings.constants';
import moment from 'moment';

const bookingsSchema = new Schema<IBookings>(
  {
    id: {
      type: String,
      unique: true,
      default: () => generateCryptoString(10),
    },
    modelType: {
      type: String,
      enum: Object.values(BOOKING_MODEL_TYPE),
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.pending,
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.pending,
    },
    totalRooms: {
      type: Number,
      default: 1,
    },
    reference: {
      type: Types.ObjectId,
      refPath: 'modelType',
      required: true,
    },
    author: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    additionalInfo: {
      name: {
        type: String,
        default: null,
      },
      phoneNumber: {
        type: String,
        default: null,
      },
    },
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expireAt: {
      type: Date,
      default: () => {
        const expireAt = new Date();
        // expireAt.setHours(expireAt.getHours() + 3); // add 3 hours
        expireAt.setMinutes(expireAt.getMinutes() + 5); // add 5 minutes
        return expireAt;
      },
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

bookingsSchema.pre('save', function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('Start date must be before end date'));
  }

  this.startDate = moment(this.startDate).utc().toDate();
  this.endDate = moment(this.endDate).utc().toDate();
  next();
});

bookingsSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
bookingsSchema.index({ startDate: 1, endDate: 1 });
bookingsSchema.index({ modelType: 1, reference: 1 });
const Bookings = model<IBookings, IBookingsModules>('Bookings', bookingsSchema);
export default Bookings;
