import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import AppError from '../error/AppError';
import config from '../config';
import ChargilyService from '../builder/Chargily';

/**
 * Authenticates Chargily Pay webhook requests by verifying the `signature`
 * header (HMAC-SHA256 of the raw body with the API secret key).
 * Docs: https://dev.chargily.com/pay-v2/webhooks
 */
const verifyChargilyWebhook = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const signature = req.get('signature');

    if (!signature) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Missing Chargily webhook signature',
      );
    }

    const rawBody =
      req.rawBody ??
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    if (!rawBody) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Missing Chargily webhook payload',
      );
    }

    const apiSecretKey = config.chargily.chargily_secret_key;
    if (!apiSecretKey) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Chargily secret key is not configured',
      );
    }

    const isValid = ChargilyService.verifyWebhookSignature(
      rawBody,
      signature,
      apiSecretKey,
    );

    if (!isValid) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Invalid Chargily webhook signature',
      );
    }

    next();
  },
);

export default verifyChargilyWebhook;
