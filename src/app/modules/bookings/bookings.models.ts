import { model, Schema, Types } from 'mongoose';
import {
  BOOKING_MODEL_TYPE,
  IBookings,
  IBookingsModules,
} from './bookings.interface';
import generateCryptoString from '../../utils/generateCryptoString';
import { BOOKING_STATUS, PAYMENT_STATUS } from './bookings.constants'; 

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
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
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

bookingsSchema.index({  }, { expireAfterSeconds: 259200 });

const Bookings = model<IBookings, IBookingsModules>('Bookings', bookingsSchema);
export default Bookings;
