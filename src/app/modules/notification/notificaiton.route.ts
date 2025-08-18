import { Router } from 'express';
import auth from '../../middleware/auth';
import { notificationControllers } from './notification.controller';
import { USER_ROLE } from '../user/user.constants';

const router = Router();
// router.post("/",)
router.get(
  '/',
  auth(
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.hotel_owner,
  ),
  notificationControllers.getAllNotifications,
);
router.patch(
  '/',
  auth(
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.hotel_owner,
  ),
  notificationControllers.markAsDone,
);
router.delete(
  '/:id',
  auth(
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.hotel_owner,
  ),
  notificationControllers.deleteANotification,
);
router.delete(
  '/',
  auth(
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.hotel_owner,
  ),
  notificationControllers.deleteNotification,
);

export const notificationRoutes = router;
