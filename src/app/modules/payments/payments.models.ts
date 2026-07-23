import { model, Schema } from 'mongoose';
import { IPayments, IPaymentsModules } from './payments.interface';
import generateCryptoString from '../../utils/generateCryptoString';

const paymentsSchema = new Schema<IPayments>(
  {
    id: {
      type: String,
      unique: true,
      default: () => generateCryptoString(6, 'PAY'),
    },
    bookings: {
      type: Schema.Types.ObjectId,
      ref: 'Bookings',
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      enum: ['DZD', 'EUR', 'USD'],
      // required: true,
    },

    paidAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    tranId: { type: String, unique: true, sparse: true },

    paymentGateway: {
      type: String,
      enum: ['stripe', 'chargily'],
    },
    payment_method: {
      type: String,
    },
    paymentIntentId: {
      type: String,
    },
    refundedAmount: { type: Number },
    refundReason: {
      type: String,
    },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

paymentsSchema.index({
  bookings: 1,
});

paymentsSchema.index({
  user: 1,
  author: 1,
});

paymentsSchema.index({
  tranId: 1,
});

paymentsSchema.index({
  paymentGateway: 1,
  status: 1,
});

const Payments = model<IPayments, IPaymentsModules>('Payments', paymentsSchema);
export default Payments;
