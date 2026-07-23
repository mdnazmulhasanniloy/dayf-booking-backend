import { Router } from 'express';
import { paymentsController } from './payments.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();
router.post('/checkout', auth(USER_ROLE.user), paymentsController.checkout);
router.get('/confirm-payment', paymentsController.confirmPayment);
router.post('/chargily', paymentsController.chargilyConfirmPayment);
router.get('/receipt/:paymentId', paymentsController.downloadReceipt);

// router.patch('/:id', paymentsController.updatePayments);
// router.delete('/:id', paymentsController.deletePayments);
// Restrict this catch-all route to MongoDB ObjectIds so static endpoints such
// as /confirm-payment can never be interpreted as a payment id.
router.get('/:id([0-9a-fA-F]{24})', paymentsController.getPaymentsById);
// router.get('/', paymentsController.getAllPayments);
export const paymentsRoutes = router;
