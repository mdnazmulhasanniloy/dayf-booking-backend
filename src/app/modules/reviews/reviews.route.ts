
import { Router } from 'express';
import { reviewsController } from './reviews.controller';

const router = Router();

router.post('/', reviewsController.createReviews);
router.patch('/:id', reviewsController.updateReviews);
router.delete('/:id', reviewsController.deleteReviews);
router.get('/:id', reviewsController.getReviewsById);
router.get('/', reviewsController.getAllReviews);

export const reviewsRoutes = router;