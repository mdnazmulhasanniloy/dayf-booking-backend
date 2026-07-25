import { Router } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../user/user.constants';
import { refundRequestController } from './refundRequest.controller';
import { refundRequestValidation } from './refundRequest.validation';

const router = Router();

router.get('/policy', refundRequestController.getActivePolicy);
router.patch(
  '/policy',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  validateRequest(refundRequestValidation.updateCancellationPolicy),
  refundRequestController.updateActivePolicy,
);

router.post(
  '/booking/:bookingId',
  auth(USER_ROLE.user),
  validateRequest(refundRequestValidation.createRefundRequest),
  refundRequestController.createCancellationRequest,
);

router.post(
  '/booking/:bookingId/host-cancel',
  auth(USER_ROLE.hotel_owner),
  validateRequest(refundRequestValidation.createRefundRequest),
  refundRequestController.createHostCancellation,
);

router.post(
  '/booking/:bookingId/no-show',
  auth(USER_ROLE.hotel_owner),
  validateRequest(refundRequestValidation.createRefundRequest),
  refundRequestController.reportNoShow,
);

router.get(
  '/my',
  auth(USER_ROLE.user),
  refundRequestController.getMyRefundRequests,
);

router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  refundRequestController.getAllRefundRequests,
);

router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  validateRequest(refundRequestValidation.updateRefundRequest),
  refundRequestController.updateRefundRequest,
);

export const refundRequestRoutes = router;
