import httpStatus from 'http-status';
import { IPayments } from './payments.interface';
import Payments from './payments.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import Stripe from 'stripe';
import config from '../../config';
import generateRandomString from '../../utils/generateRandomString';
import Bookings from '../bookings/bookings.models';
import { BOOKING_MODEL_TYPE, IBookings } from '../bookings/bookings.interface';
import { createCheckoutSession } from './payments.utils';
import { startSession } from 'mongoose';
import { PAYMENT_STATUS } from './payments.constants';
import { User } from '../user/user.models';
import { BOOKING_STATUS } from '../bookings/bookings.constants';
import { USER_ROLE } from '../user/user.constants';
import { notificationServices } from '../notification/notification.service';
import { IUser } from '../user/user.interface';
import { modeType } from '../notification/notification.interface';

const stripe = new Stripe(config.stripe?.stripe_api_secret as string, {
  apiVersion: '2024-06-20',
  typescript: true,
});

const checkout = async (payload: IPayments) => {
  const tranId = generateRandomString(10);
  let paymentData: IPayments;

  const bookings: IBookings | null = await Bookings?.findById(
    payload?.bookings,
  ).populate('reference');

  if (!bookings) {
    throw new AppError(httpStatus.NOT_FOUND, 'subscription Not Found!');
  }

  const isExistPayment: IPayments | null = await Payments.findOne({
    bookings: payload?.bookings,
    status: 'pending',
    user: payload?.user,
  });

  if (isExistPayment) {
    const payment = await Payments.findByIdAndUpdate(
      isExistPayment?._id,
      { tranId },
      { new: true },
    );

    paymentData = payment as IPayments;
  } else {
    if (bookings?.modelType === BOOKING_MODEL_TYPE.Rooms) {
      payload.adminAmount = bookings?.totalPrice * 0.08;
      payload.adminAmount = bookings?.totalPrice * 0.92;
    } else if (bookings?.modelType === BOOKING_MODEL_TYPE.Apartment) {
      payload.adminAmount = bookings?.totalPrice * 0.1;
      payload.adminAmount = bookings?.totalPrice * 0.9;
    }

    payload.tranId = tranId;
    payload.author = bookings?.author;
    payload.amount = bookings?.totalPrice;
    const createdPayment = await Payments.create(payload);

    if (!createdPayment) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create payment',
      );
    }
    paymentData = createdPayment;
  }

  if (!paymentData)
    throw new AppError(httpStatus.BAD_REQUEST, 'payment not found');

  const checkoutSession = await createCheckoutSession({
    // customerId: customer.id,
    product: {
      amount: paymentData?.amount,
      //@ts-ignore
      name: bookings?.reference?.name,
      quantity: 1,
    },

    //@ts-ignore
    paymentId: paymentData?._id,
  });

  return checkoutSession?.url;
};

const confirmPayment = async (query: Record<string, any>) => {
  const { sessionId, paymentId } = query;
  const session = await startSession();
  const PaymentSession = await stripe.checkout.sessions.retrieve(sessionId);
  const paymentIntentId = PaymentSession.payment_intent as string;

  if (PaymentSession.status !== 'complete') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment session is not completed',
    );
  }

  try {
    session.startTransaction();
    const payment = await Payments.findByIdAndUpdate(
      paymentId,
      { status: PAYMENT_STATUS?.paid, paymentIntentId: paymentIntentId },
      { new: true, session },
    ).populate([
      { path: 'user', select: 'name _id email phoneNumber profile ' },
      { path: 'author', select: 'name _id email phoneNumber profile' },
    ]);

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment Not Found!');
    }
    const bookings = await Bookings.findByIdAndUpdate(
      payment?.bookings,
      {
        paymentStatus: PAYMENT_STATUS?.paid,
        status: BOOKING_STATUS?.completed,
        tranId: payment?.tranId,
      },
      { new: true, session },
    );

    const admin = await User.findOne({ role: USER_ROLE.admin });

    notificationServices.insertNotificationIntoDb({
      receiver: (payment?.user as IUser)?._id, // User
      message: 'Your booking payment was successful!',
      description: `Your payment for booking ID #${bookings?.id} has been successfully processed. Thank you for choosing us!`,
      reference: payment?._id,
      model_type: modeType?.payments,
    });
    notificationServices.insertNotificationIntoDb({
      receiver: (payment?.author as IUser)?._id,
      message: 'A new booking payment has been received!',
      description: `User ${(payment?.user as IUser)?.name} has completed payment for booking ID #${bookings?.id} in your property.`,
      reference: payment?._id,
      model_type: modeType?.payments,
    });
    notificationServices.insertNotificationIntoDb({
      receiver: admin?._id, // System Admin
      message: 'A new booking payment has been processed!',
      description: `Payment with ID ${bookings?.id} for a hotel/apartment booking has been successfully processed.`,
      reference: payment?._id,
      model_type: modeType?.payments,
    });

    await session.commitTransaction();
    return payment;
  } catch (error: any) {
    await session.abortTransaction();

    if (paymentIntentId) {
      try {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
      } catch (refundError: any) {
        console.error('Error processing refund:', refundError.message);
      }
    }

    throw new AppError(httpStatus.BAD_GATEWAY, error.message);
  } finally {
    session.endSession();
  }
};

const createPayments = async (payload: IPayments) => {
  const result = await Payments.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create payments');
  }
  return result;
};

const getAllPayments = async (query: Record<string, any>) => {
  query['isDeleted'] = false;
  const paymentsModel = new QueryBuilder(Payments.find(), query)
    .search([''])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await paymentsModel.modelQuery;
  const meta = await paymentsModel.countTotal();

  return {
    data,
    meta,
  };
};

const getPaymentsById = async (id: string) => {
  const result = await Payments.findById(id);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Payments not found!');
  }
  return result;
};

const updatePayments = async (id: string, payload: Partial<IPayments>) => {
  const result = await Payments.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to update Payments');
  }
  return result;
};

const deletePayments = async (id: string) => {
  const result = await Payments.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete payments');
  }
  return result;
};

export const paymentsService = {
  createPayments,
  getAllPayments,
  getPaymentsById,
  updatePayments,
  deletePayments,
  checkout,
  confirmPayment,
};
