import { Router } from 'express';
import { apartmentController } from './apartment.controller';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middleware/parseData';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(USER_ROLE.hotel_owner),
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'profile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  parseData(),
  apartmentController.createApartment,
);
router.patch(
  '/:id',
  auth(USER_ROLE.hotel_owner),
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'profile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  parseData(),
  apartmentController.updateApartment,
);
router.delete(
  '/:id',
  auth(
    USER_ROLE.hotel_owner,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),

  apartmentController.deleteApartment,
);

router.get(
  '/my-apartment',
  auth(USER_ROLE.hotel_owner),
  apartmentController.getMyApartment,
);
router.get('/:id', apartmentController.getApartmentById);
router.get('/', apartmentController.getAllApartment);

export const apartmentRoutes = router;
