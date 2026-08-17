import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { pubClient } from '../redis';

const rateLimitRedisReady = pubClient.isOpen
  ? Promise.resolve()
  : pubClient.connect();

const redisStore = (name: string) =>
  new RedisStore({
    sendCommand: async (...args: string[]) => {
      await rateLimitRedisReady;
      return pubClient.sendCommand(args);
    },
    prefix: `dayf:rate-limit:${name}:`,
  });

const rateLimitResponse = {
  success: false,
  message: 'Too many requests. Please try again later.',
};

export const apiRateLimiter = rateLimit({
  store: redisStore('api'),
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse,
});

export const authRateLimiter = rateLimit({
  store: redisStore('auth'),
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

export const passwordResetRateLimiter = rateLimit({
  store: redisStore('password-reset'),
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
  },
});

export const otpSendRateLimiter = rateLimit({
  store: redisStore('otp-send'),
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
  },
});

export const otpVerifyRateLimiter = rateLimit({
  store: redisStore('otp-verify'),
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many invalid OTP attempts. Please try again after 15 minutes.',
  },
});

export const tokenRateLimiter = rateLimit({
  store: redisStore('token'),
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse,
});
