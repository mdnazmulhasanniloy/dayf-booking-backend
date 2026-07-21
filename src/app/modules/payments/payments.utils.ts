import httpStatus from 'http-status';
import ChargilyService from '../../builder/Chargily';
import StripeService from '../../builder/StripeBuilder';
import config from '../../config';
import AppError from '../../error/AppError';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.models';
import { IPayments } from './payments.interface';
import { convertFromUsd } from '../../builder/exchangerateservice';
import { Response } from 'express';

export const buildRedirectUrls = (paymentId: string, redirectType?: string) => {
  const success_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentId}&device=${redirectType ?? ''}`;
  const cancel_url = `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${paymentId}&device=${redirectType ?? ''}`;
  return { success_url, cancel_url };
};
export const buildChargilyRedirectUrls = (
  paymentId: string,
  redirectType?: string,
) => {
  const success_url = `${config.client_Url}/booking/success`;
  const failed_url = `${config.client_Url}/booking/failed`;
  const notification_url = `${config.server_url}/payments/chargily?paymentId=${paymentId}&device=${redirectType ?? ''}`;
  return { success_url, failed_url, notification_url };
};

export const getOrCreateStripeCustomerId = async (
  user: IUser,
): Promise<string> => {
  if (user?.customerId) return user.customerId;

  const customer = await StripeService.createCustomer(user?.email, user?.name);
  await User.findByIdAndUpdate(
    user?._id,
    { customerId: customer?.id },
    { upsert: false },
  );
  return customer.id;
};

export const getOrCreateChargilyCustomerId = async (
  user: IUser,
): Promise<string> => {
  if (user?.chargilyCustomerId) return user.chargilyCustomerId;

  // NOTE: name/email were swapped in the original code (name: user.email, email: user.name)
  const customer = await ChargilyService.createCustomer({
    name: user?.name,
    email: user?.email,
  });
  await User.findByIdAndUpdate(
    user?._id,
    { chargilyCustomerId: customer?.id },
    { upsert: false },
  );
  return customer.id;
};

export const createStripeCheckoutUrl = async (
  payment: IPayments,
  redirectType?: string,
  currency?: string,
): Promise<string> => {
  const user = await User.IsUserExistId(payment?.user?.toString());
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User Not Found!');
  const customerId = await getOrCreateStripeCustomerId(user);
  const { success_url, cancel_url } = buildRedirectUrls(
    //@ts-ignore
    payment?._id.toString(),
    redirectType,
  );
  let amount;
  // console.log(currency?.toLocaleLowerCase());
  switch (currency?.toLowerCase()) {
    case 'usd':
      amount = await convertFromUsd(payment.amount, 'usd');
      break;

    case 'eur':
      amount = await convertFromUsd(payment.amount, 'eur');
      break;

    case 'dzd':
      amount = await convertFromUsd(payment.amount, 'dzd');
      break;

    default:
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Unsupported currency. Accepted currencies are USD, EUR, and DZD.',
      );
  }

  const checkoutSession = await StripeService.getCheckoutSession(
    { amount, name: 'Booking a apartment', quantity: 1 },
    success_url,
    cancel_url,
    customerId,
    currency?.toLocaleLowerCase() ?? 'usd',
  );

  if (!checkoutSession?.url) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'Failed to create Stripe checkout session',
    );
  }

  return checkoutSession.url;
};

export const createChargilyCheckoutUrl = async (
  payment: IPayments,
  redirectType?: string,
  currency?: string,
): Promise<string> => {
  if (currency?.toLocaleLowerCase() !== 'dzd') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Unsupported currency. Chargily Pay only supports DZD.',
    );
  }
  const user = await User.IsUserExistId(payment?.user?.toString());
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User Not Found!');

  const customerId = await getOrCreateChargilyCustomerId(user);
  const { success_url, failed_url, notification_url } =
    //@ts-ignore
    buildChargilyRedirectUrls(payment?._id?.toString(), redirectType);

  const amount = await convertFromUsd(payment?.amount, 'dzd');

  const checkoutSession = await ChargilyService.createCheckout({
    amount,
    currency: 'dzd',
    success_url,
    failure_url: failed_url,
    webhook_endpoint: notification_url,
    customer_id: customerId,
  });

  if (!checkoutSession?.checkout_url) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'Failed to create Chargily checkout session',
    );
  }

  return checkoutSession.checkout_url;
};

export const chargilyError = (
  res: Response,
  message: string,
  device?: string,
) => {
  const params = new URLSearchParams({
    message,
  });

  if (device === 'website') {
    return res.redirect(`${config.client_Url}/payment?${params.toString()}`);
  }

  throw new AppError(httpStatus.BAD_REQUEST, message);
};
