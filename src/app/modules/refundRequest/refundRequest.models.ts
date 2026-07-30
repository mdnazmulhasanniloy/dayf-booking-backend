import { model, Schema, Types } from 'mongoose';
import {
  REFUND_REQUEST_STATUS,
  TRefundRequestStatus,
} from './refundRequest.constants';

export interface IRefundRequest {
  booking: Types.ObjectId;
  payment?: Types.ObjectId;
  guest: Types.ObjectId;
  host: Types.ObjectId;
  reference: Types.ObjectId;
  requestedBy: Types.ObjectId;
  reason: string;
  daysBeforeCheckIn: number;
  isEligible: boolean;
  refundAmount: number;
  currency?: string;
  status: TRefundRequestStatus;
  cancellationType: 'guest_cancellation' | 'host_cancellation' | 'no_show';
  suspicious: boolean;
  boostEligible: boolean;
  policySnapshot: {
    depositRate: number;
    freeCancellationDays: number;
    refundProcessingHours: number;
    creditDelayMinBusinessDays: number;
    creditDelayMaxBusinessDays: number;
    listingBoostDays: number;
    policyText: string;
  };
  adminNote?: string;
  manualRefundReference?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  refundedAt?: Date;
  history: Array<{
    action: string;
    actor: Types.ObjectId;
    note?: string;
    at: Date;
  }>;
}

const refundRequestSchema = new Schema<IRefundRequest>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Bookings',
      required: true,
      unique: true,
    },
    payment: { type: Schema.Types.ObjectId, ref: 'Payments' },
    guest: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reference: { type: Schema.Types.ObjectId, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    daysBeforeCheckIn: { type: Number, required: true },
    isEligible: { type: Boolean, required: true },
    refundAmount: { type: Number, required: true, min: 0 },
    currency: { type: String },
    status: {
      type: String,
      enum: Object.values(REFUND_REQUEST_STATUS),
      default: REFUND_REQUEST_STATUS.pending,
      required: true,
    },
    cancellationType: {
      type: String,
      enum: ['guest_cancellation', 'host_cancellation', 'no_show'],
      required: true,
      default: 'guest_cancellation',
    },
    suspicious: { type: Boolean, required: true, default: false },
    boostEligible: { type: Boolean, required: true, default: false },
    policySnapshot: {
      depositRate: { type: Number, required: true },
      freeCancellationDays: { type: Number, required: true },
      refundProcessingHours: { type: Number, required: true },
      creditDelayMinBusinessDays: { type: Number, required: true },
      creditDelayMaxBusinessDays: { type: Number, required: true },
      listingBoostDays: { type: Number, required: true },
      noShowReportWindowHours: { type: Number, required: true, default: 2 },
      hostSuspensionDays: { type: Number, required: true, default: 7 },
      policyText: { type: String, required: true },
    },
    adminNote: { type: String, trim: true, maxlength: 1000 },
    manualRefundReference: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    refundedAt: { type: Date },
    history: [
      {
        action: { type: String, required: true },
        actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String },
        at: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true },
);

refundRequestSchema.index({ guest: 1, createdAt: -1 });
refundRequestSchema.index({ status: 1, createdAt: -1 });

const RefundRequest = model<IRefundRequest>(
  'RefundRequest',
  refundRequestSchema,
);

export default RefundRequest;
