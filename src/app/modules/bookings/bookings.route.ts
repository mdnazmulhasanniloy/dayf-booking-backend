import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.post('/', auth(USER_ROLE.user), bookingsController.createBookings);
router.patch(
  '/complete/:id',
  auth(USER_ROLE.user, USER_ROLE.hotel_owner),
  bookingsController.completeBooking,
);
router.patch(
  '/canceled/:id',
  auth(USER_ROLE.user),
  bookingsController.cancelBooking,
);
// router.patch('/:id', bookingsController.updateBookings);
router.delete('/:id', bookingsController.deleteBookings);
router.get(
  '/my-bookings',
  auth(USER_ROLE.user),
  bookingsController.getMyBookings,
);
router.get(
  '/reference/:referenceId',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.hotel_owner,
  ),
  bookingsController.getAllBookingsWithReference,
);
router.get(
  '/:id',
  auth(
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
    USER_ROLE.hotel_owner,
    USER_ROLE.user,
  ),
  bookingsController.getBookingsById,
);
router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  bookingsController.getAllBookings,
);

export const bookingsRoutes = router;
