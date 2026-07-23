import { IApartment } from './../apartment/apartment.interface';
import httpStatus from 'http-status';
import { IPayments } from './payments.interface';
import Payments from './payments.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';
import Bookings from '../bookings/bookings.models';
import { IBookings } from '../bookings/bookings.interface';
import { isValidObjectId, startSession } from 'mongoose';
import { PAYMENT_STATUS } from './payments.constants';
import { User } from '../user/user.models';
import { BOOKING_STATUS } from '../bookings/bookings.constants';
import { USER_ROLE } from '../user/user.constants';
import { IUser } from '../user/user.interface';
import { modeType } from '../notification/notification.interface';
import StripeService from '../../builder/StripeBuilder';
import { Response } from 'express';
import moment from 'moment';
import { notificationQueue, sendMailQueue } from '../../redis';
import ChargilyService from '../../builder/Chargily';
import {
  createChargilyCheckoutUrl,
  createStripeCheckoutUrl,
} from './payments.utils';
import Calender from '../calender/calender.models';
import path from 'path';
import fs from 'fs';
import config from '../../config';
import { generateReceiptPdf } from '../../utils/generateReceiptPdf';

const formatPaymentDate = (value?: Date | string | null) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : moment(date).format('lll');
};

const createReceiptAttachment = async (payment: any, booking: any) => {
  const pdfBuffer = await generateReceiptPdf({
    paymentId: payment.id,
    bookingId: booking?.bookingCode ?? '',
    apartmentName: booking?.reference?.name ?? 'Apartment',
    checkIn: booking?.startDate
      ? new Date(booking.startDate).toLocaleDateString('en-GB')
      : '',
    checkOut: booking?.endDate
      ? new Date(booking.endDate).toLocaleDateString('en-GB')
      : '',
    guestName: payment?.user?.name ?? 'Guest',
    guestEmail: payment?.user?.email ?? '',
    amount: payment.amount,
    currency: payment.currency ?? 'USD',
    paymentMethod: String(payment.payment_method ?? 'card'),
    paymentGateway: payment.paymentGateway ?? 'stripe',
    paymentDate: formatPaymentDate(payment.paidAt),
    hostName: payment?.author?.name,
  });

  return {
    filename: `receipt-${payment.id}.pdf`,
    contentBase64: pdfBuffer.toString('base64'),
    contentType: 'application/pdf',
  };
};

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

    if (device === 'website') {
      throw res.redirect(
        `${config.client_Url}/booking/failed?message=${encodeURIComponent(
          'Payment session is not completed',
        )}&paymentId=${paymentId}`,
      );
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payment session is not completed',
      );
    }
  }
  try {
    session.startTransaction();
    const charge = await StripeService.getStripe().charges.retrieve(
      paymentIntent.latest_charge as string,
    );
    if (charge?.refunded) {
      if (device === 'website') {
        throw res.redirect(
          `${config.client_Url}/booking/failed?message=${encodeURIComponent(
            'Payment has been refunded',
          )}&paymentId=${paymentId}`,
        );
      } else {
        throw new AppError(httpStatus.BAD_REQUEST, 'Payment has been refunded');
      }
    }
    const paymentDate = moment.unix(charge.created).toDate();
    const payments = await Payments.findById(paymentId);
    if (!payments) {
      if (device === 'website') {
        throw res.redirect(
          `${config.client_Url}/booking/failed?message=${encodeURIComponent(
            'Payment record not found.',
          )}&paymentId=${paymentId}`,
        );
      } else {
        throw new AppError(httpStatus.BAD_REQUEST, 'Payment record not found.');
      }
    }

    if (payments.status === PAYMENT_STATUS.paid) {
      if (device === 'website') {
        throw res.redirect(
          `${config.client_Url}/booking/failed?message=${encodeURIComponent(
            'This payment has already been completed.',
          )}&paymentId=${paymentId}`,
        );
      } else {
        throw new AppError(httpStatus.BAD_REQUEST, 'Payment record not found.');
      }
    } else if (payments.status === PAYMENT_STATUS.failed) {
      if (device === 'website') {
        throw res.redirect(
          `${config.client_Url}/booking/failed?message=${encodeURIComponent(
            'This payment has already failed. Please create a new payment and try again.',
          )}&paymentId=${paymentId}`,
        );
      } else {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This payment has already failed. Please create a new payment and try again.',
        );
      }
    } else if (payments.status === PAYMENT_STATUS.refunded) {
      if (device === 'website') {
        throw res.redirect(
          `${config.client_Url}/booking/failed?message=${encodeURIComponent(
            'This payment has already been refunded.',
          )}&paymentId=${paymentId}`,
        );
      } else {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'This payment has already been refunded.',
        );
      }
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
        paidAt: paymentDate,
      },
      { new: true, session },
    ).populate([
      { path: 'user', select: 'name _id email phoneNumber profile ' },
      { path: 'author', select: 'name _id email phoneNumber profile' },
    ]);

    if (!payment) {
      if (device === 'website') {
        throw res.redirect(
          `${config.client_Url}/booking/failed?message=${encodeURIComponent(
            'Payment Not Found!',
          )}&paymentId=${paymentId}`,
        );
      } else {
        throw new AppError(httpStatus.BAD_REQUEST, 'Payment Not Found!');
      }
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
    ).populate([
      { path: 'reference' },
      { path: 'author', select: 'name email phoneNumber profile' },
      { path: 'user', select: 'name email phoneNumber profile' },
    ]);

    if (!bookings) {
      throw new AppError(httpStatus.NOT_FOUND, 'Booking not found for payment');
    }

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

    if (admin?.email) {
      const paymentAdminEmailPath = path.join(
        __dirname,
        '../../../../public/view/payment/payment_success_for_admin.html',
      );

      const html = fs
        .readFileSync(paymentAdminEmailPath, 'utf8')
        .replace('{{paymentId}}', payment?.id)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{amount}}', payment?.amount?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase())
        .replace('{{transitionId}}', `${payment?.tranId}`)
        .replace('{{paymentMethod}}', `${payment?.paymentGateway}`)
        .replace('{{paymentDate}}', formatPaymentDate(payment?.paidAt))
        .replace('{{userName}}', (payment?.user as IUser)?.name);

      const adminPaymentAlertMail = {
        email: admin?.email,
        subject: 'New Booking Payment Received',
        html: html,
      };
      await sendMailQueue.add('new_mail', adminPaymentAlertMail);
    }

    if ((payment?.user as IUser)?.email) {
      const paymentUserEmailPath = path.join(
        __dirname,
        '../../../../public/view/payment/payment_success_for_user.html',
      );
      const bookingUserEmailPath = path.join(
        __dirname,
        '../../../../public/view/booking/booking_confirm_for_user.html',
      );
      const html = fs
        .readFileSync(paymentUserEmailPath, 'utf8')
        .replace('{{hostName}}', (payment?.author as IUser)?.name)
        .replace('{{paymentId}}', payment?.id)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{amount}}', payment?.amount?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase())
        .replace('{{transitionId}}', `${payment?.tranId}`)
        .replace('{{paymentMethod}}', `${payment?.paymentGateway}`)
        .replace('{{paymentDate}}', formatPaymentDate(payment?.paidAt))
        .replace('{{userName}}', (payment?.user as IUser)?.name)
        .replace(
          '{{receiptUrl}}',
          `${config?.server_url}/payments/receipt/${paymentId}`,
        );

      const bookingConfirmHtml = fs
        .readFileSync(bookingUserEmailPath, 'utf8')
        .replace('{{userName}}', (payment?.user as IUser)?.name)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{checkIn}}', moment(bookings?.startDate).format('ll'))
        .replace('{{checkOut}}', moment(bookings?.endDate).format('ll'))
        .replace('{{guests}}', `${bookings?.guest?.toString() ?? ''}`)
        .replace('{{amount}}', payment?.amount?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase());

      const userBookingConfirmAlertMail = {
        email: (bookings?.user as IUser)?.email,
        subject: 'Your Booking Is Confirmed',
        html: bookingConfirmHtml,
      };
      const userPaymentAlertMail = {
        email: (bookings?.user as IUser)?.email,
        subject: 'Payment Confirmation and Receipt',
        html: html,
        attachments: [await createReceiptAttachment(payment, bookings)],
      };
      await sendMailQueue.add('new_mail', userBookingConfirmAlertMail);
      await sendMailQueue.add('new_mail', userPaymentAlertMail);
    }

    if (payment?.author) {
      const BookingConfirmEmailPath = path.join(
        __dirname,
        '../../../../public/view/booking/booking_confirmation_for_hotelOwner.html',
      );

      const html = fs
        .readFileSync(BookingConfirmEmailPath, 'utf8')
        .replace('{{hostName}}', (payment?.author as IUser)?.name)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{checkIn}}', moment(bookings?.startDate).format('ll'))
        .replace('{{checkOut}}', moment(bookings?.endDate).format('ll'))
        .replace('{{guests}}', `${bookings?.guest}`)
        .replace('{{amount}}', Number(bookings?.remainingAmount)?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase())
        .replace('{{userName}}', (payment?.user as IUser)?.name);

      const authorBookingAlertMail = {
        email: admin?.email,
        subject: 'New Booking Confirmed for Your Property',
        html: html,
      };
      await sendMailQueue.add('new_mail', authorBookingAlertMail);
    }

    await session.commitTransaction();
    return { ...payment.toObject(), device, chargeDetails };
  } catch (error: any) {
    await session.abortTransaction();
    if (paymentIntentId) {
      try {
        await StripeService.refund(paymentIntentId);
      } catch (refundError: any) {
        console.error('Error processing refund:', refundError.message);

        if (device === 'website') {
          throw res.redirect(
            `${config.client_Url}/booking/failed?message=${encodeURIComponent(
              `Error processing refund:'${refundError.message}`,
            )}&paymentId=${paymentId}`,
          );
        } else {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Error processing refund:'${refundError.message}`,
          );
        }
      }
    }
    if (device === 'website') {
      throw res.redirect(
        `${config.client_Url}/booking/failed?message=${encodeURIComponent(
          error.message || 'Server internal error',
        )}&paymentId=${paymentId}`,
      );
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        error.message || 'Server internal error',
      );
    }
  } finally {
    session.endSession();
  }
};

const chargilyConfirmPayment = async (payload: any, paymentId: string) => {
  if (!payload?.data?.id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid Chargily payload');
  }
  if (!isValidObjectId(paymentId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payment id');
  }
  const checkoutId = payload.data.id;

  // Verify payment from Chargily
  const verification = await ChargilyService.verifyPayment(checkoutId);

  if (!verification?.checkout) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'Unable to verify Chargily payment',
    );
  }

  const metadataPaymentId = verification.checkout.metadata?.paymentId;
  if (metadataPaymentId && metadataPaymentId.toString() !== paymentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Chargily checkout does not match this payment',
    );
  }

  if (!verification.paid) {
    await Payments.findByIdAndUpdate(paymentId, {
      status: PAYMENT_STATUS.failed,
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Payment is ${verification.status}`,
    );
  }

  const session = await startSession();
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
    ).populate([
      { path: 'reference' },
      { path: 'author', select: 'name email phoneNumber profile' },
      { path: 'user', select: 'name email phoneNumber profile' },
    ]);

    if (!bookings) {
      throw new AppError(httpStatus.NOT_FOUND, 'Booking not found for payment');
    }

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
      receiver: (bookings.user as IUser)?._id,
      message: 'Your booking payment was successful!',
      description: `Your payment for booking #${bookings?.bookingCode} has been successfully processed.`,
      refference: payment._id,
      model_type: modeType.payments,
    });

    await notificationQueue.add('new_notification', {
      receiver: (bookings.author as IUser)?._id,
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
    if (admin?.email) {
      const paymentAdminEmailPath = path.join(
        __dirname,
        '../../../../public/view/payment/payment_success_for_admin.html',
      );

      const html = fs
        .readFileSync(paymentAdminEmailPath, 'utf8')
        .replace('{{paymentId}}', payment?.id)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{amount}}', payment?.amount?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase())
        .replace('{{transitionId}}', `${payment?.tranId}`)
        .replace('{{paymentMethod}}', `${payment?.paymentGateway}`)
        .replace('{{paymentDate}}', formatPaymentDate(payment?.paidAt))
        .replace('{{userName}}', (payment?.user as IUser)?.name);

      const adminPaymentAlertMail = {
        email: admin?.email,
        subject: 'New Booking Payment Received',
        html: html,
      };
      await sendMailQueue.add('new_mail', adminPaymentAlertMail);
    }

    if ((payment?.user as IUser)?.email) {
      const paymentUserEmailPath = path.join(
        __dirname,
        '../../../../public/view/payment/payment_success_for_user.html',
      );
      const bookingUserEmailPath = path.join(
        __dirname,
        '../../../../public/view/booking/booking_confirm_for_user.html',
      );
      const html = fs
        .readFileSync(paymentUserEmailPath, 'utf8')
        .replace('{{hostName}}', (payment?.author as IUser)?.name)
        .replace('{{paymentId}}', payment?.id)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{amount}}', payment?.amount?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase())
        .replace('{{transitionId}}', `${payment?.tranId}`)
        .replace('{{paymentMethod}}', `${payment?.paymentGateway}`)
        .replace('{{paymentDate}}', formatPaymentDate(payment?.paidAt))
        .replace('{{userName}}', (payment?.user as IUser)?.name)
        .replace(
          '{{receiptUrl}}',
          `${config?.server_url}/payments/receipt/${paymentId}`,
        );

      const bookingConfirmHtml = fs
        .readFileSync(bookingUserEmailPath, 'utf8')
        .replace('{{userName}}', (payment?.user as IUser)?.name)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{checkIn}}', moment(bookings?.startDate).format('ll'))
        .replace('{{checkOut}}', moment(bookings?.endDate).format('ll'))
        .replace('{{guests}}', `${bookings?.guest?.toString() ?? ''}`)
        .replace('{{amount}}', payment?.amount?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase());

      const userBookingConfirmAlertMail = {
        email: (bookings?.user as IUser)?.email,
        subject: 'Your Booking Is Confirmed',
        html: bookingConfirmHtml,
      };
      const userPaymentAlertMail = {
        email: (bookings?.user as IUser)?.email,
        subject: 'Payment Confirmation and Receipt',
        html: html,
        attachments: [await createReceiptAttachment(payment, bookings)],
      };
      await sendMailQueue.add('new_mail', userBookingConfirmAlertMail);
      await sendMailQueue.add('new_mail', userPaymentAlertMail);
    }

    if (payment?.author) {
      const BookingConfirmEmailPath = path.join(
        __dirname,
        '../../../../public/view/booking/booking_confirmation_for_hotelOwner.html',
      );

      const html = fs
        .readFileSync(BookingConfirmEmailPath, 'utf8')
        .replace('{{hostName}}', (payment?.author as IUser)?.name)
        .replace('{{bookingId}}', `${bookings?.bookingCode}`)
        .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
        .replace('{{checkIn}}', moment(bookings?.startDate).format('ll'))
        .replace('{{checkOut}}', moment(bookings?.endDate).format('ll'))
        .replace('{{guests}}', `${bookings?.guest}`)
        .replace('{{amount}}', Number(bookings?.remainingAmount)?.toString())
        .replace('{{currency}}', payment?.currency?.toUpperCase())
        .replace('{{userName}}', (payment?.user as IUser)?.name);

      const authorBookingAlertMail = {
        email: admin?.email,
        subject: 'New Booking Confirmed for Your Property',
        html: html,
      };
      await sendMailQueue.add('new_mail', authorBookingAlertMail);
    }
    // if (admin?.email) {
    //   const paymentAdminEmailPath = path.join(
    //     __dirname,
    //     '../../../../public/view/payment/payment_success_for_admin.html',
    //   );

    //   const html = fs
    //     .readFileSync(paymentAdminEmailPath, 'utf8')
    //     .replace('{{paymentId}}', payment?.id)
    //     .replace('{{bookingId}}', `${bookings?.bookingCode}`)
    //     .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
    //     .replace('{{amount}}', payment?.amount?.toString())
    //     .replace('{{currency}}', payment?.currency?.toUpperCase())
    //     .replace('{{transitionId}}', `${payment?.tranId}`)
    //     .replace('{{paymentMethod}}', `${payment?.paymentGateway}`)
    //     .replace('{{paymentDate}}', formatPaymentDate(payment?.paidAt))
    //     .replace('{{userName}}', (payment?.user as IUser)?.name);

    //   const adminPaymentAlertMail = {
    //     email: admin?.email,
    //     subject: 'New Payment Received',
    //     html: html,
    //   };
    //   await sendMailQueue.add('new_mail', adminPaymentAlertMail);
    // }

    // if ((payment?.user as IUser)?.email) {
    //   const paymentUserEmailPath = path.join(
    //     __dirname,
    //     '../../../../public/view/payment/payment_success_for_user.html',
    //   );
    //   const bookingUserEmailPath = path.join(
    //     __dirname,
    //     '../../../../public/view/booking/booking_confirm_for_user.html',
    //   );
    //   const html = fs
    //     .readFileSync(paymentUserEmailPath, 'utf8')
    //     .replace('{{hostName}}', (payment?.author as IUser)?.name)
    //     .replace('{{paymentId}}', payment?.id)
    //     .replace('{{bookingId}}', `${bookings?.bookingCode}`)
    //     .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
    //     .replace('{{amount}}', payment?.amount?.toString())
    //     .replace('{{currency}}', payment?.currency?.toUpperCase())
    //     .replace('{{transitionId}}', `${payment?.tranId}`)
    //     .replace('{{paymentMethod}}', `${payment?.paymentGateway}`)
    //     .replace('{{paymentDate}}', formatPaymentDate(payment?.paidAt))
    //     .replace('{{userName}}', (payment?.user as IUser)?.name)
    //     .replace(
    //       '{{receiptUrl}}',
    //       `${config?.server_url}/api/v1/payments/receipt/${paymentId}`,
    //     );

    //   const bookingConfirmHtml = fs
    //     .readFileSync(bookingUserEmailPath, 'utf8')
    //     .replace('{{userName}}', (payment?.user as IUser)?.name)
    //     .replace('{{bookingId}}', `${bookings?.bookingCode}`)
    //     .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
    //     .replace('{{checkIn}}', moment(bookings?.startDate).format('ll'))
    //     .replace('{{checkOut}}', moment(bookings?.endDate).format('ll'))
    //     .replace('{{guests}}', `${bookings?.guest?.toString() ?? ''}`)
    //     .replace('{{amount}}', payment?.amount?.toString())
    //     .replace('{{currency}}', payment?.currency?.toUpperCase());

    //   const userBookingConfirmAlertMail = {
    //     email: (bookings?.user as IUser)?.email,
    //     subject: 'New Booking Confirmed!',
    //     html: bookingConfirmHtml,
    //   };
    //   const userPaymentAlertMail = {
    //     email: (bookings?.user as IUser)?.email,
    //     subject: 'Transition successfully Completed!',
    //     html: html,
    //     attachments: [await createReceiptAttachment(payment, bookings)],
    //   };
    //   await sendMailQueue.add('new_mail', userBookingConfirmAlertMail);
    //   await sendMailQueue.add('new_mail', userPaymentAlertMail);
    // }

    // if (payment?.author) {
    //   const BookingConfirmEmailPath = path.join(
    //     __dirname,
    //     '../../../../public/view/booking/booking_confirmation_for_hotelOwner.html',
    //   );

    //   const html = fs
    //     .readFileSync(BookingConfirmEmailPath, 'utf8')
    //     .replace('{{hostName}}', (payment?.author as IUser)?.name)
    //     .replace('{{bookingId}}', `${bookings?.bookingCode}`)
    //     .replace('{{apartmentName}}', (bookings?.reference as IApartment)?.name)
    //     .replace('{{checkIn}}', moment(bookings?.startDate).format('ll'))
    //     .replace('{{checkOut}}', moment(bookings?.endDate).format('ll'))
    //     .replace('{{guests}}', `${bookings?.guest}`)
    //     .replace('{{amount}}', Number(bookings?.remainingAmount)?.toString())
    //     .replace('{{currency}}', payment?.currency?.toUpperCase())
    //     .replace('{{userName}}', (payment?.user as IUser)?.name);

    //   const authorBookingAlertMail = {
    //     email: admin?.email,
    //     subject: 'A user has been confirm apartment booking.',
    //     html: html,
    //   };
    //   await sendMailQueue.add('new_mail', authorBookingAlertMail);
    // }
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
  if (!isValidObjectId(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payment id');
  }

  const result = await Payments.findById(id).populate([
    { path: 'bookings', populate: { path: 'reference' } },
    { path: 'user', select: 'name email phoneNumber profile' },
    { path: 'author', select: 'name email phoneNumber profile' },
  ]);
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

const downloadReceipt = async (id: string) => {
  if (!isValidObjectId(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payment id');
  }

  const payment = await Payments.findById(id).populate([
    { path: 'user' },
    { path: 'author' },
    { path: 'bookings', populate: [{ path: 'reference' }] },
  ]);
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  if (payment.status !== 'paid') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Receipt is only available for paid payments',
    );
  }

  const booking = payment.bookings as IBookings & {
    reference?: IApartment;
  };

  const pdfBuffer = await generateReceiptPdf({
    paymentId: payment.id,
    bookingId: booking?.bookingCode ?? '',
    apartmentName: booking?.reference?.name ?? 'Apartment',
    checkIn: booking?.startDate
      ? new Date(booking.startDate).toLocaleDateString('en-GB')
      : '',
    checkOut: booking?.endDate
      ? new Date(booking.endDate).toLocaleDateString('en-GB')
      : '',
    guestName: (payment.user as any)?.name ?? 'Guest',
    guestEmail: (payment.user as any)?.email ?? '',
    amount: payment.amount,
    currency: payment.currency ?? 'USD',
    paymentMethod: String(payment.payment_method ?? 'card'),
    paymentGateway: payment.paymentGateway ?? 'stripe',
    paymentDate: formatPaymentDate(payment.paidAt),
    hostName: (payment?.author as IUser)?.name,
  });

  return pdfBuffer;
};

export const paymentsService = {
  getAllPayments,
  getPaymentsById,
  updatePayments,
  deletePayments,
  checkout,
  confirmPayment,
  chargilyConfirmPayment,
  downloadReceipt,
};
