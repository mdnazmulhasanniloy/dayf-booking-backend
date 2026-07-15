import { Router } from 'express';
import { calenderController } from './calender.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.post(
  '/',
  auth(
    USER_ROLE.hotel_owner,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),
  calenderController.createCalender,
);
router.patch(
  '/:id',
  auth(
    USER_ROLE.hotel_owner,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),
  calenderController.updateCalender,
);
router.delete(
  '/:id',
  auth(
    USER_ROLE.hotel_owner,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),
  calenderController.deleteCalender,
);
router.get('/availability/:apartmentId', calenderController.getAvailability);
router.get('/:id', calenderController.getCalenderById);
router.get('/', calenderController.getAllCalender);

export const calenderRoutes = router;
