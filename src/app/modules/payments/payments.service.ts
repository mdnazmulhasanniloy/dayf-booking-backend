import httpStatus from 'http-status';
import { IPayments } from './payments.interface';
import Payments from './payments.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import config from '../../config';
import Bookings from '../bookings/bookings.models';
import { BOOKING_MODEL_TYPE, IBookings } from '../bookings/bookings.interface';
import { startSession } from 'mongoose';
import { PAYMENT_STATUS } from './payments.constants';
import { User } from '../user/user.models';
import { BOOKING_STATUS } from '../bookings/bookings.constants';
import { USER_ROLE } from '../user/user.constants';
import { IUser } from '../user/user.interface';
import { modeType } from '../notification/notification.interface';
import StripeService from '../../builder/StripeBuilder';
import { IApartment } from '../apartment/apartment.interface';
import { IRoomTypes } from '../roomTypes/roomTypes.interface';
import { IProperty } from '../property/property.interface';
import RoomTypes from '../roomTypes/roomTypes.models';
import { Response } from 'express';
import moment from 'moment';
import Contents from '../contents/contents.models';
import { IContents } from '../contents/contents.interface';
import { notificationQueue } from '../../redis';
import ChargilyService from '../../builder/Chargily';
import {
  buildRedirectUrls,
  chargilyError,
  createChargilyCheckoutUrl,
  createStripeCheckoutUrl,
  getOrCreateChargilyCustomerId,
} from './payments.utils';
import Calender from '../calender/calender.models';

// const checkout = async (payload: IPayments) => {
//   let paymentData: IPayments;
//   let name: string;

//   const bookings: IBookings | null = await Bookings?.findById(
//     payload?.bookings,
//   ).populate([
//     { path: 'reference' },
//     { path: 'author', select: 'stripeAccountId _id' },
//   ]);

//   if (!bookings) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Booking Not Found!');
//   }

//   const isExistPayment: IPayments | null = await Payments.findOne({
//     bookings: payload?.bookings,
//     status: 'pending',
//     user: payload?.user,
//   });

//   if (isExistPayment) {
//     paymentData = isExistPayment as IPayments;
//   } else {
//     const contents: IContents | null = await Contents.findOne({});
//     if (!contents)
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         'server internal error, commission content not found',
//       );

//     if (bookings?.modelType === BOOKING_MODEL_TYPE.Rooms) {
//       const roomType: IRoomTypes | null = await RoomTypes?.findById(
//         bookings?.reference,
//       ).populate([{ path: 'property', select: 'name' }]);
//       const adminPercentage = Number(contents?.commotionForRooms);
//       const ownerPercentage = 100 - adminPercentage;

//       name = (roomType?.property as IProperty)?.name;
//       payload.adminAmount = parseFloat(
//         (Number(bookings?.totalPrice) * (adminPercentage / 100)).toFixed(2),
//       );

//       payload.hotelOwnerAmount = parseFloat(
//         (Number(bookings?.totalPrice) * (ownerPercentage / 100)).toFixed(2),
//       );

//       // payload.adminAmount = parseFloat(
//       //   (Number(bookings?.totalPrice) * 0.08).toFixed(2),
//       // );
//       // payload.hotelOwnerAmount = parseFloat(
//       //   (Number(bookings?.totalPrice) * 0.92).toFixed(2),
//       // );
//     } else if (bookings?.modelType === BOOKING_MODEL_TYPE.Apartment) {
//       const adminPercentage = Number(contents?.commotionForApartment);
//       const ownerPercentage = 100 - adminPercentage;

//       payload.adminAmount = parseFloat(
//         (Number(bookings?.totalPrice) * (adminPercentage / 100)).toFixed(2),
//       );

//       payload.hotelOwnerAmount = parseFloat(
//         (Number(bookings?.totalPrice) * (ownerPercentage / 100)).toFixed(2),
//       );
//       // payload.adminAmount = parseFloat(
//       //   (Number(bookings?.totalPrice) * 0.1).toFixed(2),
//       // );
//       // payload.hotelOwnerAmount = parseFloat(
//       //   (Number(bookings?.totalPrice) * 0.9).toFixed(2),
//       // );

//       name = (bookings?.reference as IApartment)?.name;
//     }

//     //@ts-ignore
//     payload.author = (bookings?.author as IUser)?._id;
//     payload.amount = bookings?.totalPrice;
//     const createdPayment = await Payments.create(payload);

//     if (!createdPayment) {
//       throw new AppError(
//         httpStatus.INTERNAL_SERVER_ERROR,
//         'Failed to create payment',
//       );
//     }
//     paymentData = createdPayment;
//   }

//   if (!paymentData)
//     throw new AppError(httpStatus.BAD_REQUEST, 'payment not found');

//   const product = {
//     amount: paymentData?.amount,
//     //@ts-ignore

//     name: name ?? 'A Booking Payment',
//     quantity: 1,
//   };

//   let customerId = '';
//   const user = await User.IsUserExistId(paymentData?.user?.toString());
//   if (user?.customerId) {
//     customerId = user?.customerId;
//   } else {
//     const customer = await StripeService.createCustomer(
//       user?.email,
//       user?.name,
//     );
//     await User.findByIdAndUpdate(
//       user?._id,
//       { customerId: customer?.id },
//       { upsert: false },
//     );

//     customerId = customer?.id;
//   }

//   const success_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentData?._id}&device=${payload?.redirectType ? payload?.redirectType : ''}`;

//   const cancel_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentData?._id}&device=${payload?.redirectType ? payload?.redirectType : ''}`;
//   console.log({ success_url, cancel_url });
//   const checkoutSession = await StripeService.getCheckoutSession(
//     product,
//     success_url,
//     cancel_url,
//     (bookings?.author as IUser)?.stripeAccountId as string,
//     paymentData?.hotelOwnerAmount,
//     customerId,
//   );
//   return checkoutSession?.url;
// };
/*
const checkout = async (payload: IPayments) => {
  let paymentData: IPayments;
  let name: string;
  const bookings: IBookings | null = await Bookings?.findById(
    payload?.bookings,
  ).populate([
    { path: 'reference' },
    // { path: 'author', select: 'stripeAccountId _id' },
  ]);

  if (!bookings) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking Not Found!');
  }

  const isExistPayment: IPayments | null = await Payments.findOne({
    bookings: payload?.bookings,
    status: 'pending',
    user: payload?.user,
  });

  if (isExistPayment) {
    if (isExistPayment?.status !== PAYMENT_STATUS.pending)
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        'A payment has already been processed for this booking.',
      );
    paymentData = isExistPayment as IPayments;
  } else {
    switch (payload.paymentGateway) {
      case 'stripe':
        const payment = await Payments.create({
          amount: bookings?.depositAmount,
          author: bookings?.author,
          user: bookings?.user,
          bookings: bookings?._id,
          status: PAYMENT_STATUS.pending,
          paymentGateway: payload?.paymentGateway,
          currency: 'USD',
        });

        if (!payment) throw new AppError(httpStatus.BAD_REQUEST, '');
        const product = {
          amount: payment?.amount,
          name: 'Booking a apartment',
          quantity: 1,
        };

        const success_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment?._id}&device=${payload?.redirectType ? payload?.redirectType : ''}`;

        const cancel_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment?._id}&device=${payload?.redirectType ? payload?.redirectType : ''}`;
        console.log({ success_url, cancel_url });
        let customerId = '';
        const user = await User.IsUserExistId(payment?.user?.toString());
        if (user?.customerId) {
          customerId = user?.customerId;
        } else {
          const customer = await StripeService.createCustomer(
            user?.email,
            user?.name,
          );
          await User.findByIdAndUpdate(
            user?._id,
            { customerId: customer?.id },
            { upsert: false },
          );

          customerId = customer?.id;
        }
        const checkoutSession = await StripeService.getCheckoutSession(
          product,
          success_url,
          cancel_url,
          customerId,
        );
        return checkoutSession?.url;
        break;
      case 'chargily':
        const payment = await Payments.create({
          amount: bookings?.depositAmount,
          author: bookings?.author,
          user: bookings?.user,
          bookings: bookings?._id,
          status: PAYMENT_STATUS.pending,
          paymentGateway: payload?.paymentGateway,
          currency: 'dzd',
        });

        if (!payment) throw new AppError(httpStatus.BAD_REQUEST, '');
        const product = {
          amount: payment?.amount,
          name: 'Booking a apartment',
          quantity: 1,
        };

        const success_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment?._id}&device=${payload?.redirectType ? payload?.redirectType : ''}`;

        const cancel_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payment?._id}&device=${payload?.redirectType ? payload?.redirectType : ''}`;

        let customerId = '';

        const user = await User.IsUserExistId(payment?.user?.toString());
        if (user?.chargilyCustomerId) {
          customerId = user?.chargilyCustomerId;
        } else {
          const customer = await ChargilyService.createCustomer({
            name: user?.email,
            email: user?.name,
          });

           
          await User.findByIdAndUpdate(
            user?._id,
            { chargilyCustomerId: customer?.id },
            { upsert: false },
          );

          customerId = customer?.id;
        }

         const checkoutSession = await ChargilyService.createCheckout({
    amount: payment?.price,
    currency: 'dzd',
    success_url: success_url,
    failure_url: failed_url,
    webhook_endpoint: success_url,
    customer_id: customerId,
  });

  return checkoutSession.checkout_url
        break;
      default:
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Invalid Payment gateway selected',
        );
    }
  }
};
 */

const checkout = async (payload: IPayments): Promise<string> => {
  const bookings: IBookings | null = await Bookings?.findById(
    payload?.bookings,
  ).populate([{ path: 'reference' }]);

  if (!bookings) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking Not Found!');
  }

  const existingPayment: IPayments | null = await Payments.findOne({
    bookings: payload?.bookings,
    status: PAYMENT_STATUS.pending,
    user: payload?.user,
    paymentGateway: payload?.paymentGateway,
  });

  const payment: IPayments =
    existingPayment ??
    (await Payments.create({
      amount: bookings?.depositAmount,
      author: bookings?.author,
      user: bookings?.user,
      bookings: bookings?._id,
      status: PAYMENT_STATUS.pending,
      paymentGateway: payload?.paymentGateway,
    }));

  if (!payment) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Failed to create payment record',
    );
  }

  switch (payload.paymentGateway) {
    case 'stripe':
      return createStripeCheckoutUrl(
        payment,
        payload?.redirectType,
        payload?.currency?.toLocaleLowerCase() ?? 'usd',
      );
    case 'chargily':
      return createChargilyCheckoutUrl(
        payment,
        payload?.redirectType,
        payload?.currency?.toLocaleLowerCase(),
      );
    default:
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid Payment gateway selected',
      );
  }
};

// const confirmPayment = async (query: Record<string, any>, res: Response) => {
//   const { sessionId, paymentId, device } = query;
//   const session = await startSession();
//   const PaymentSession = await StripeService.getPaymentSession(sessionId);

//   const paymentIntentId = PaymentSession.payment_intent as string;
//   const paymentIntent =
//     await StripeService.getStripe().paymentIntents.retrieve(paymentIntentId);
//   // Retrieve the PaymentIntent

//   if (!(await StripeService.isPaymentSuccess(sessionId))) {
//     await Payments.findByIdAndUpdate(paymentId, {
//       status: PAYMENT_STATUS.failed,
//     });
//     throw res.render('paymentError', {
//       message: 'Payment session is not completed',
//       device: device || '',
//     });
//   }

//   try {
//     session.startTransaction();

//     const charge = await StripeService.getStripe().charges.retrieve(
//       paymentIntent.latest_charge as string,
//     );

//     if (charge?.refunded) {
//       throw new AppError(httpStatus.BAD_REQUEST, 'Payment has been refunded');
//     }
//     const paymentDate = moment.unix(charge.created).format('YYYY-MM-DD HH:mm'); // Adjusted format

//     // Create the output object
//     const chargeDetails = {
//       amount: charge?.amount,
//       currency: charge?.currency,
//       status: charge?.status,
//       paymentMethod: charge?.payment_method,
//       paymentMethodDetails: charge?.payment_method_details?.card,
//       transactionId: charge?.balance_transaction,
//       cardLast4: charge?.payment_method_details?.card?.last4,
//       paymentDate: paymentDate,
//       receipt_url: charge?.receipt_url,
//     };

//     const payment = await Payments.findByIdAndUpdate(
//       paymentId,
//       {
//         status: PAYMENT_STATUS?.paid,
//         paymentIntentId: paymentIntentId,
//         tranId: charge?.balance_transaction,
//       },
//       { new: true, session },
//     ).populate([
//       { path: 'user', select: 'name _id email phoneNumber profile ' },
//       { path: 'author', select: 'name _id email phoneNumber profile' },
//     ]);

//     if (!payment) {
//       throw new AppError(httpStatus.NOT_FOUND, 'Payment Not Found!');
//     }

//     const bookings = await Bookings.findByIdAndUpdate(
//       payment?.bookings,
//       {
//         paymentStatus: PAYMENT_STATUS?.paid,
//         status: BOOKING_STATUS?.confirmed,
//         $unset: { expireAt: '' },
//         tranId: payment?.tranId,
//         receiptUrl: chargeDetails?.receipt_url,
//         currency: chargeDetails?.currency,
//       },
//       { new: true, session },
//     );

//     const admin = await User.findOne({ role: USER_ROLE.admin });

//     const userNotification = {
//       receiver: (payment?.user as IUser)?._id, // User
//       message: 'Your booking payment was successful!',
//       description: `Your payment for booking ID #${bookings?.id} has been successfully processed. Thank you for choosing us!`,
//       refference: payment?._id,
//       model_type: modeType?.payments,
//     };
//     const authorNotification = {
//       receiver: (payment?.author as IUser)?._id,
//       message: 'A new booking payment has been received!',
//       description: `User ${(payment?.user as IUser)?.name} has completed payment for booking ID #${bookings?.id} in your property.`,
//       refference: payment?._id,
//       model_type: modeType?.payments,
//     };
//     const adminNotification = {
//       receiver: admin?._id, // System Admin
//       message: 'A new booking payment has been processed!',
//       description: `Payment with ID ${bookings?.id} for a hotel/apartment booking has been successfully processed.`,
//       refference: payment?._id,
//       model_type: modeType?.payments,
//     };
//     await notificationQueue.add('new_notification', userNotification);
//     await notificationQueue.add('new_notification', authorNotification);
//     await notificationQueue.add('new_notification', adminNotification);

//     await session.commitTransaction();
//     return { ...payment.toObject(), device, chargeDetails };
//   } catch (error: any) {
//     await session.abortTransaction();

//     if (paymentIntentId) {
//       try {
//         await StripeService.refund(paymentIntentId);
//       } catch (refundError: any) {
//         console.error('Error processing refund:', refundError.message);
//       }
//     }
//     throw res.render('paymentError', {
//       message: error.message || 'Server internal error',
//       device: device || '',
//     });
//     throw new AppError(httpStatus.BAD_GATEWAY, error.message);
//   } finally {
//     session.endSession();
//   }
// };
const confirmPayment = async (query: Record<string, any>, res: Response) => {
  const { sessionId, paymentId, device } = query;
  const session = await startSession();
  const PaymentSession = await StripeService.getPaymentSession(sessionId);
  const paymentIntentId = PaymentSession.payment_intent as string;
  const paymentIntent =
    await StripeService.getStripe().paymentIntents.retrieve(paymentIntentId);
  // Retrieve the PaymentIntent
  if (!(await StripeService.isPaymentSuccess(sessionId))) {
    await Payments.findByIdAndUpdate(paymentId, {
      status: PAYMENT_STATUS.failed,
    });

    throw chargilyError(res, 'Payment session is not completed', device);
  }
  try {
    session.startTransaction();
    const charge = await StripeService.getStripe().charges.retrieve(
      paymentIntent.latest_charge as string,
    );
    if (charge?.refunded) {
      throw chargilyError(res, 'Payment has been refunded', device);
    }
    const paymentDate = moment.unix(charge.created).format('YYYY-MM-DD HH:mm'); // Adjusted format
    const payments = await Payments.findById(paymentId);
    if (!payments) {
      throw chargilyError(res, 'Payment record not found.', device);
    }

    if (payments.status === PAYMENT_STATUS.paid) {
      throw chargilyError(
        res,
        'This payment has already been completed.',
        device,
      );
    } else if (payments.status === PAYMENT_STATUS.failed) {
      throw chargilyError(
        res,
        'This payment has already failed. Please create a new payment and try again.',
        device,
      );
    } else if (payments.status === PAYMENT_STATUS.refunded) {
      throw chargilyError(
        res,
        'This payment has already been refunded.',
        device,
      );
    }

    // Create the output object
    const chargeDetails = {
      amount: charge?.amount,
      currency: charge?.currency,
      status: charge?.status,
      paymentMethod: charge?.payment_method,
      transactionId: charge?.balance_transaction,
      paymentDate: paymentDate,
    };
    const payment = await Payments.findByIdAndUpdate(
      paymentId,
      {
        status: PAYMENT_STATUS?.paid,
        paymentIntentId: paymentIntentId,
        tranId: charge?.balance_transaction,
        currency: charge.currency,
        payment_method: charge?.payment_method_details?.type,
        paymentGateway: 'stripe',
        paidAt: moment(paymentDate).utc().toDate(),
      },
      { new: true, session },
    ).populate([
      { path: 'user', select: 'name _id email phoneNumber profile ' },
      { path: 'author', select: 'name _id email phoneNumber profile' },
    ]);

    if (!payment) {
      throw chargilyError(res, 'Payment Not Found!', device);
    }
    const bookings = await Bookings.findByIdAndUpdate(
      payment?.bookings,
      {
        paymentStatus: PAYMENT_STATUS?.paid,
        status: BOOKING_STATUS?.confirmed,
        $unset: { expireAt: null },
        tranId: payment?.tranId,
        currency: chargeDetails?.currency,
      },
      { new: true, session },
    );

    await Calender.updateMany(
      {
        bookingId: bookings?._id,
      },
      {
        $set: {
          expireAt: null,
        },
      },
      { session },
    );
    const admin = await User.findOne({ role: USER_ROLE.admin });
    const userNotification = {
      receiver: bookings?.user, // User
      message: 'Your booking payment was successful!',
      description: `Your payment for booking ID #${bookings?.bookingCode} has been successfully processed. Thank you for choosing us!`,
      refference: payment?._id,
      model_type: modeType?.payments,
    };
    const authorNotification = {
      receiver: bookings?.author,
      message: 'A new booking payment has been received!',
      description: `User ${(payment?.user as IUser)?.name} has completed payment for booking ID #${bookings?.id} in your property.`,
      refference: payment?._id,
      model_type: modeType?.payments,
    };
    const adminNotification = {
      receiver: admin?._id, // System Admin
      message: 'A new booking payment has been processed!',
      description: `Payment with ID ${bookings?.id} for a hotel/apartment booking has been successfully processed.`,
      refference: payment?._id,
      model_type: modeType?.payments,
    };
    await notificationQueue.add('new_notification', userNotification);
    await notificationQueue.add('new_notification', authorNotification);
    await notificationQueue.add('new_notification', adminNotification);

    await session.commitTransaction();
    return { ...payment.toObject(), device, chargeDetails };
  } catch (error: any) {
    await session.abortTransaction();
    if (paymentIntentId) {
      try {
        await StripeService.refund(paymentIntentId);
      } catch (refundError: any) {
        chargilyError(
          res,
          `Error processing refund:'${refundError.message}`,
          device,
        );
        console.error('Error processing refund:', refundError.message);
      }
    }
    chargilyError(res, error.message || 'Server internal error', device);
  } finally {
    session.endSession();
  }
};

const chargilyConfirmPayment = async (payload: any, paymentId: string) => {
  const session = await startSession();
  if (!payload) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid Request');
  const checkoutId = payload?.data.id;

  // Verify payment from Chargily
  const verification = await ChargilyService.verifyPayment(checkoutId);

  if (!verification.paid) {
    await Payments.findByIdAndUpdate(paymentId, {
      status: PAYMENT_STATUS.failed,
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Payment is ${verification.status}`,
    );
  }

  try {
    session.startTransaction();

    const checkout = verification.checkout;

    const payments = await Payments.findById(paymentId);

    if (!payments) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment record not found.');
    }

    if (payments.status === PAYMENT_STATUS.paid) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This payment has already been completed.',
      );
    }

    if (payments.status === PAYMENT_STATUS.failed) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This payment has already failed.',
      );
    }

    if (payments.status === PAYMENT_STATUS.refunded) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This payment has already been refunded.',
      );
    }

    const paidAt = moment.unix(checkout.updated_at).utc().toDate();

    const payment = await Payments.findByIdAndUpdate(
      paymentId,
      {
        status: PAYMENT_STATUS.paid,
        tranId: checkout.invoice_id || checkout.id,
        paymentIntentId: checkout.id,
        currency: checkout.currency.toUpperCase(),
        payment_method: checkout.payment_method,
        paymentGateway: 'chargily',
        paidAt,
      },
      { new: true, session },
    ).populate([
      {
        path: 'user',
        select: 'name _id email phoneNumber profile',
      },
      {
        path: 'author',
        select: 'name _id email phoneNumber profile',
      },
    ]);

    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payment not found.');
    }

    const bookings = await Bookings.findByIdAndUpdate(
      payment.bookings,
      {
        paymentStatus: PAYMENT_STATUS.paid,
        status: BOOKING_STATUS.confirmed,
        tranId: payment.tranId,
        currency: checkout.currency.toUpperCase(),
        $unset: {
          expireAt: '',
        },
      },
      {
        new: true,
        session,
      },
    );

    await Calender.updateMany(
      {
        bookingId: bookings?._id,
      },
      {
        $unset: {
          expireAt: '',
        },
      },
      {
        session,
      },
    );

    const admin = await User.findOne({
      role: USER_ROLE.admin,
    });

    await notificationQueue.add('new_notification', {
      receiver: bookings?.user,
      message: 'Your booking payment was successful!',
      description: `Your payment for booking #${bookings?.bookingCode} has been successfully processed.`,
      refference: payment._id,
      model_type: modeType.payments,
    });

    await notificationQueue.add('new_notification', {
      receiver: bookings?.author,
      message: 'A new booking payment has been received!',
      description: `User ${(payment.user as IUser).name} has completed payment for booking #${bookings?.bookingCode}.`,
      refference: payment._id,
      model_type: modeType.payments,
    });

    await notificationQueue.add('new_notification', {
      receiver: admin?._id,
      message: 'A new booking payment has been processed!',
      description: `Booking payment #${bookings?.bookingCode} has been processed successfully.`,
      refference: payment._id,
      model_type: modeType.payments,
    });

    await session.commitTransaction();

    return {
      payment,
      checkout,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    throw error;
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
  chargilyConfirmPayment,
};
