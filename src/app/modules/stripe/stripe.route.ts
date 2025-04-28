import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import { stripeController } from './stripe.controller';

const router = Router();

router.patch(
  '/connect',
  auth(USER_ROLE.hotel_owner),
  stripeController.stripLinkAccount,
);
router.get('/oauth/callback', stripeController?.handleStripeOAuth);
router.post('/return', stripeController.returnUrl);
router.get('/refresh/:id', stripeController.refresh);

const stripeRoute = router;
export default stripeRoute;
