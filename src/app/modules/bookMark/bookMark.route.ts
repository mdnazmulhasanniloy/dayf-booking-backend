
import { Router } from 'express';
import { bookMarkController } from './bookMark.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();

router.post('/', auth(USER_ROLE.user), bookMarkController.createBookMark);
router.patch('/:id',auth(USER_ROLE.user), bookMarkController.updateBookMark);
router.delete('/:id',auth(USER_ROLE.user), bookMarkController.deleteBookMark);
router.get('/:id',auth(USER_ROLE.user), bookMarkController.getBookMarkById);
router.get('/',auth(USER_ROLE.user), bookMarkController.getAllBookMark);

export const bookMarkRoutes = router;