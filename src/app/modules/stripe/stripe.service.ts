import Stripe from 'stripe';
import config from '../../config';
import { User } from '../user/user.models';
import AppError from '../../error/AppError';
import httpStatus from 'http-status';
import StripeService from '../../builder/StripeBuilder';
import { IUser } from '../user/user.interface';

// Create Stripe account and return the account link URL
const stripLinkAccount = async (userId: string) => {
  const user: IUser | null = await User.findById(userId);

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found!');
  }
  let account;

  try {
    const accounts = await StripeService.getStripe().accounts.list();
    const isExistsAccount = accounts.data.find(
      acc => acc.email === user?.email,
    );

    if (isExistsAccount) {
      account = isExistsAccount;
    } else {
      account = await StripeService.getStripe().accounts.create({
        type: 'express',
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        email: user?.email,
      });
    }

    const refresh_url = `${config?.server_url}/stripe/refresh/${account.id}?userId=${user?._id}`;

    const return_url = `${config?.client_Url}/seller/confirmation?userId=${user._id}&stripeAccountId=${account.id}`;
    const accountLink = await StripeService.connectAccount(
      return_url,
      refresh_url,
      account?.id,
    );

    return accountLink.url;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_GATEWAY, error.message);
  }
};

// Handle Stripe OAuth and save the connected account ID
const handleStripeOAuth = async (
  query: Record<string, any>,
  userId: string,
) => {
  try {
    const response = await StripeService.getStripe().oauth.token({
      grant_type: 'authorization_code',

      code: query.code as string,
    });

    const connectedAccountId = response.stripe_user_id;

    await User.findByIdAndUpdate(userId, {
      stripeAccountId: connectedAccountId,
    });
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error.message);
  }
};

// Refresh the account link for a given payment ID
const refresh = async (accountId: string, query: Record<string, any>) => {
  const user = await User.findById(query.userId);

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found!');
  }

  try {
    const refresh_url = `${config?.server_url}/stripe/refresh/${accountId}?userId=${user?._id}`;

    const return_url = `${config?.client_Url}/seller/confirmation?userId=${user._id}&stripeAccountId=${accountId}`;
    const accountLink = await StripeService.connectAccount(
      return_url,
      refresh_url,
      accountId,
    );
    return accountLink.url;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error.message);
  }
};

// Handle the return URL and update the user's Stripe account ID
const returnUrl = async (payload: {
  stripeAccountId: string;
  userId: string;
}) => {
  try {
    const user = await User.findByIdAndUpdate(payload.userId, {
      stripeAccountId: payload?.stripeAccountId,
    });

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'user not found!');
    }
    return { url: config.client_Url + 'login' };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error.message);
  }
};

// connect account for apk
const stripLinkAccountForAPK = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found!');
  }
  const account = await StripeService.getStripe().accounts.create({
    // email: user?.email, (optional: uncomment if you want to pass user's email)
  });

  try {
    const return_url = `${config?.server_url}/stripe/apk/return?stripeAccountId=${account.id}&userId=${user?._id}`;
    const refresh_url = `${config?.server_url}/stripe/apk/refresh/${account.id}?userId=${user?._id}`;

    const accountLink = await StripeService.connectAccount(
      return_url,
      refresh_url,
      account?.id,
    );

    return accountLink.url;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_GATEWAY, error.message);
  }
};
const refreshFOrAPK = async (paymentId: string, query: Record<string, any>) => {
  const user = await User.findById(query.userId);

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User not found!');
  }

  try {
    const return_url = `${config?.server_url}/stripe/apk/return?stripeAccountId=${paymentId}&userId=${user?._id}`;
    const refresh_url = `${config?.server_url}/stripe/apk/refresh/${paymentId}?userId=${user?._id}`;

    const accountLink = await StripeService.connectAccount(
      return_url,
      refresh_url,
      paymentId,
    );

    return accountLink.url;
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error.message);
  }
};

// Handle the return URL and update the user's Stripe account ID
const returnUrlForAPK = async (query: Record<string, any>) => {
  try {
    const user = await User.findByIdAndUpdate(query?.userId, {
      stripeAccountId: query?.stripeAccountId,
    });

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, 'user not found!');
    }
    return { url: config?.client_Url };
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, error.message);
  }
};

export const stripeService = {
  handleStripeOAuth,
  stripLinkAccount,
  refresh,
  returnUrl,
  stripLinkAccountForAPK,
  refreshFOrAPK,
  returnUrlForAPK,
};
