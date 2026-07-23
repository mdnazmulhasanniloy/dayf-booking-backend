import { model, Schema, Types } from 'mongoose';
import moment from 'moment';

import {
  BOOKING_MODEL_TYPE,
  IBookings,
  IBookingsModules,
} from './bookings.interface';

import { BOOKING_STATUS, PAYMENT_STATUS } from './bookings.constants';

import generateCryptoString from '../../utils/generateCryptoString';

const bookingsSchema = new Schema<IBookings>(
  {
    //Booking Information
    bookingCode: {
      type: String,
      unique: true,
      default: () => generateCryptoString(6, 'BK'),
    },

    modelType: {
      type: String,
      enum: Object.values(BOOKING_MODEL_TYPE),
      required: true,
    },

    reference: {
      type: Types.ObjectId,
      refPath: 'modelType',
      required: true,
    },

    // Users

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

    // Stay Information
    guest: {
      type: Number,
      default: 1,
    },

    totalRooms: {
      type: Number,
      default: 0,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    expireAt: {
      type: Date,
      default: () => {
        const expireAt = new Date();
        expireAt.setMinutes(expireAt.getMinutes() + 5);
        return expireAt;
      },
    },

    // Payment Summary

    totalPrice: {
      type: Number,
      required: true,
    },

    depositAmount: {
      type: Number,
      required: true,
    },

    remainingAmount: {
      type: Number,
      required: true,
    },

    commissionRate: {
      type: Number,
      default: 15,
    },

    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.pending,
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    // Booking Status
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.pending,
    },

    cancelReason: {
      type: String,
      default: null,
    },

    // Metadata
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Hooks

bookingsSchema.pre('save', function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('Start date must be before end date'));
  }

  this.startDate = moment(this.startDate).utc().toDate();
  this.endDate = moment(this.endDate).utc().toDate();

  next();
});

/**
 * ==========================================
 * Indexes
 * ==========================================
 */

bookingsSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

bookingsSchema.index({
  modelType: 1,
  reference: 1,
});

bookingsSchema.index({
  startDate: 1,
  endDate: 1,
});

const Bookings = model<IBookings, IBookingsModules>('Bookings', bookingsSchema);

export default Bookings;
