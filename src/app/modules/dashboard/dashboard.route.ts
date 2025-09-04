import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.get(
  '/hotel-owner-dashboard',
  auth(USER_ROLE.hotel_owner),
  dashboardController.getHotelOwnerDashboard,
);
router.get(
  '/hotel-owner-earnings',
  auth(USER_ROLE.hotel_owner),
  dashboardController.getHotelOwnerEarning,
);
router.get(
  '/admin-dashboard',
  auth(USER_ROLE.admin),
  dashboardController.getAdminDashboard,
);
router.get(
  '/admin-top-card',
  auth(USER_ROLE.admin),
  dashboardController.getDashboardTopCardDetails,
);
router.get(
  '/user-overview',
  auth(USER_ROLE.admin),
  dashboardController.getUserOverview,
);
router.get(
  '/bookings-overview',
  auth(USER_ROLE.admin),
  dashboardController.getBookingOverview,
);
router.get(
  '/revenue-overview',
  auth(USER_ROLE.admin),
  dashboardController.getRevenueOverview,
);
router.get(
  '/booking-performance',
  // auth(USER_ROLE.admin),
  dashboardController.getBookingPerformance,
);
router.get(
  '/admin-earnings',
  auth(USER_ROLE.admin),
  dashboardController.getAdminEarning,
);

export const dashboardRoutes = router;
