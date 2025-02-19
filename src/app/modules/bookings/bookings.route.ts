import { Router } from 'express';
import { bookingsController } from './bookings.controller';

const router = Router();

router.post('/', bookingsController.createBookings);
router.patch('/complete/:id', bookingsController.completeBooking);
router.patch('/canceled/:id', bookingsController.cancelBooking);
router.patch('/:id', bookingsController.updateBookings);
router.delete('/:id', bookingsController.deleteBookings);
router.get('/my-bookings', bookingsController.getMyBookings);
router.get(
  '/reference/:referenceId',
  bookingsController.getAllBookingsWithReference,
);
router.get('/:id', bookingsController.getBookingsById);
router.get('/', bookingsController.getAllBookings);

export const bookingsRoutes = router;
