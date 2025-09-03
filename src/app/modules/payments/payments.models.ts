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
    receiptUrl: {
      type: String,
      default: null,
    },
    currency: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      enum: ['stripe'],
      default: 'stripe',
    },
    adminAmount: {
      type: Number,
    },
    hotelOwnerAmount: {
      type: Number,
    },
    tranId: { type: String, unique: true, sparse: true }, 
    bookings: { type: Schema.Types.ObjectId, ref: 'Bookings', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

 

paymentsSchema.index({ author: 1, user: 1 });
paymentsSchema.index({ tranId: 1, bookings: 1 });
const Payments = model<IPayments, IPaymentsModules>('Payments', paymentsSchema);
export default Payments;
