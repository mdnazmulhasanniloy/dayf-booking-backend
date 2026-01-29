import { Router } from 'express';
import { carouselController } from './carousel.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middleware/parseData';
import validateRequest from '../../middleware/validateRequest';
import carouselValidationSchema from './carousel.validation';

const router = Router();
const upload = multer({ storage: memoryStorage() });

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(carouselValidationSchema.create),
  carouselController.createCarousel,
);

router.patch(
  '/:id',
  upload.single('image'),
  parseData(),
  validateRequest(carouselValidationSchema.update),
  carouselController.updateCarousel,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  carouselController.deleteCarousel,
);
router.get('/:id', carouselController.getCarouselById);
router.get('/', carouselController.getAllCarousel);

export const carouselRoutes = router;
