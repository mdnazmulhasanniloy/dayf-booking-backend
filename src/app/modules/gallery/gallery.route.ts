import { Router } from 'express';
import { galleryController } from './gallery.controller';
import multer, { memoryStorage } from 'multer';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import parseData from '../../middleware/parseData';
import validateRequest from '../../middleware/validateRequest';
import { galleryValidation } from './gallery.validation';

const router = Router();
const upload = multer({ storage: memoryStorage() });

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(galleryValidation.createSchema),
  galleryController.createGallery,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(galleryValidation.updateSchema),
  galleryController.updateGallery,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  galleryController.deleteGallery,
);
router.get('/:id', galleryController.getGalleryById);
router.get('/', galleryController.getAllGallery);

export const galleryRoutes = router;
