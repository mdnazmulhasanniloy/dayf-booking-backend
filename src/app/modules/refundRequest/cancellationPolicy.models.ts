import { model, Schema } from 'mongoose';

export interface ICancellationPolicy {
  name: string;
  isActive: boolean;
  depositRate: number;
  freeCancellationDays: number;
  refundProcessingHours: number;
  creditDelayMinBusinessDays: number;
  creditDelayMaxBusinessDays: number;
  listingBoostDays: number;
  noShowReportWindowHours: number;
  hostSuspensionDays: number;
  policyText: string;
}

const cancellationPolicySchema = new Schema<ICancellationPolicy>(
  {
    name: { type: String, required: true, default: 'DAYF Standard Policy' },
    isActive: { type: Boolean, required: true, default: true },
    depositRate: { type: Number, required: true, default: 15, min: 0, max: 100 },
    freeCancellationDays: { type: Number, required: true, default: 7, min: 0 },
    refundProcessingHours: { type: Number, required: true, default: 48, min: 1 },
    creditDelayMinBusinessDays: {
      type: Number,
      required: true,
      default: 3,
      min: 0,
    },
    creditDelayMaxBusinessDays: {
      type: Number,
      required: true,
      default: 7,
      min: 0,
    },
    listingBoostDays: { type: Number, required: true, default: 7, min: 0 },
    noShowReportWindowHours: {
      type: Number,
      required: true,
      default: 2,
      min: 1,
    },
    hostSuspensionDays: {
      type: Number,
      required: true,
      default: 7,
      min: 1,
    },
    policyText: {
      type: String,
      required: true,
      default:
        'The deposit paid at booking represents 15% of the total stay amount and is non-refundable in cases of guest cancellation within 7 days of check-in or no-show. Cancellations made more than 7 days before check-in are eligible for a full refund, processed within 48 hours and credited within 3 to 7 business days.',
    },
  },
  { timestamps: true },
);

cancellationPolicySchema.index(
  { isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

const CancellationPolicy = model<ICancellationPolicy>(
  'CancellationPolicy',
  cancellationPolicySchema,
);

export default CancellationPolicy;
