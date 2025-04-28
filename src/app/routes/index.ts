import { Router } from 'express';
import { otpRoutes } from '../modules/otp/otp.routes';
import { userRoutes } from '../modules/user/user.route';
import { authRoutes } from '../modules/auth/auth.route';
import { notificationRoutes } from '../modules/notification/notificaiton.route';
import { contentsRoutes } from '../modules/contents/contents.route';
import { propertyRoutes } from '../modules/property/property.route';
import { facilitiesRoutes } from '../modules/facilities/facilities.route';
import { roomsRoutes } from '../modules/rooms/rooms.route';
import { reviewsRoutes } from '../modules/reviews/reviews.route';
import { apartmentRoutes } from '../modules/apartment/apartment.route';
import { bookingsRoutes } from '../modules/bookings/bookings.route';
import { chatRoutes } from '../modules/chat/chat.route';
import { messagesRoutes } from '../modules/messages/messages.route';
import stripeRoute from '../modules/stripe/stripe.route';
import { paymentsRoutes } from '../modules/payments/payments.route';

const router = Router();
const moduleRoutes = [
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/otp',
    route: otpRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/contents',
    route: contentsRoutes,
  },
  {
    path: '/facilities',
    route: facilitiesRoutes,
  },
  {
    path: '/apartments',
    route: apartmentRoutes,
  },
  {
    path: '/properties',
    route: propertyRoutes,
  },
  {
    path: '/rooms',
    route: roomsRoutes,
  },

  {
    path: '/bookings',
    route: bookingsRoutes,
  },
  {
    path: '/reviews',
    route: reviewsRoutes,
  },
  {
    path: '/chats',
    route: chatRoutes,
  },
  {
    path: '/messages',
    route: messagesRoutes,
  },
  {
    path: '/stripe',
    route: stripeRoute,
  },
  {
    path: '/payments',
    route: paymentsRoutes,
  },
];
moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
