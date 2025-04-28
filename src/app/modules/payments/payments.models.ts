import { model, Schema } from 'mongoose';
import { IPayments, IPaymentsModules } from './payments.interface';

const paymentsSchema = new Schema<IPayments>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'canceled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['stripe'],
      default: 'stripe',
    },
    adminAmount: {
      type: Number,
    },
    tranId: { type: String, unique: true, sparse: true },
    isTransfer: { type: Boolean, default: false },
    bookings: { type: Schema.Types.ObjectId, ref: 'Bookings', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);


const Payments = model<IPayments, IPaymentsModules>('Payments', paymentsSchema);
export default Payments;
