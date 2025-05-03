import { Router } from 'express';
import { propertyController } from './property.controller';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middleware/parseData';
import { USER_ROLE } from '../user/user.constants';
import auth from '../../middleware/auth';

const router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(USER_ROLE.hotel_owner),
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  parseData(),
  propertyController.createProperty,
);
router.patch(
  '/:id',
  auth(USER_ROLE.hotel_owner),
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  parseData(),
  propertyController.updateProperty,
);
router.delete(
  '/:id',
  auth(
    USER_ROLE.hotel_owner,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),
  propertyController.deleteProperty,
);

router.get(
  '/my-properties',
  auth(USER_ROLE.hotel_owner),
  propertyController.getMyProperty,
);
router.get("/home-page-data", propertyController.getHamePageData)
router.get('/:id', propertyController.getPropertyById);
router.get('/', propertyController.getAllProperty);

export const propertyRoutes = router;
