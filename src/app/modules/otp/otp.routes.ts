import { Router } from 'express';
import { otpControllers } from './otp.controller';
import validateRequest from '../../middleware/validateRequest';
import { resentOtpValidations } from './otp.validation';
import {
  otpSendRateLimiter,
  otpVerifyRateLimiter,
} from '../../middleware/rateLimiter';
const router = Router();

router.post(
  '/verify-otp',
  otpVerifyRateLimiter,
  validateRequest(resentOtpValidations.verifyOtpZodSchema),
  otpControllers.verifyOtp,
);
router.post(
  '/verify-email-otp',
  otpVerifyRateLimiter,
  validateRequest(resentOtpValidations.verifyOtpZodSchema),
  otpControllers.verifyOtp,
);
router.post(
  '/resend-otp',
  otpSendRateLimiter,
  validateRequest(resentOtpValidations.resentOtpZodSchema),
  otpControllers.resendOtp,
);
router.post(
  '/send-email-otp',
  otpSendRateLimiter,
  validateRequest(resentOtpValidations.resentOtpZodSchema),
  otpControllers.resendOtp,
);
router.post(
  '/send-phone-otp',
  otpSendRateLimiter,
  validateRequest(resentOtpValidations.phoneOtpZodSchema),
  otpControllers.sendPhoneOtp,
);
router.post(
  '/verify-phone-otp',
  otpVerifyRateLimiter,
  validateRequest(resentOtpValidations.verifyOtpZodSchema),
  otpControllers.verifyPhoneOtp,
);

export const otpRoutes = router;
