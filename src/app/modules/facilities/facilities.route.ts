import { Router } from 'express';
import { facilitiesController } from './facilities.controller';
import { USER_ROLE } from '../user/user.constants';
import multer, { memoryStorage } from 'multer';
import auth from '../../middleware/auth';
import parseData from '../../middleware/parseData';

const router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  upload.single('icon'),
  parseData(),
  facilitiesController.createFacilities,
);
router.patch(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  upload.single('icon'),
  parseData(),
  facilitiesController.updateFacilities,
);
router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  facilitiesController.deleteFacilities,
);
router.get('/:id', facilitiesController.getFacilitiesById);
router.get('/', facilitiesController.getAllFacilities);

export const facilitiesRoutes = router;
