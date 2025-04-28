import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.post('/', auth(USER_ROLE.user), reviewsController.createReviews);
router.patch('/:id', auth(USER_ROLE.user), reviewsController.updateReviews);
router.delete(
  '/:id',
  auth(
    USER_ROLE.user,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),
  reviewsController.deleteReviews,
);
router.get('/:id', reviewsController.getReviewsById);
router.get('/', reviewsController.getAllReviews);

export const reviewsRoutes = router;
