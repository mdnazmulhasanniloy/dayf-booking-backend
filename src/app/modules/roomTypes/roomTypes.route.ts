import { Router } from 'express';
import { roomTypesController } from './roomTypes.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middleware/parseData';

const router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(USER_ROLE.hotel_owner),
  upload.fields([{ name: 'images', maxCount: 10 }]),
  parseData(),
  roomTypesController.createRoomTypes,
);
router.patch(
  '/:id',
  auth(USER_ROLE.hotel_owner),
  upload.fields([{ name: 'images', maxCount: 10 }]),
  parseData(),
  roomTypesController.updateRoomTypes,
);
router.delete(
  '/:id',
  auth(
    USER_ROLE.hotel_owner,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),
  roomTypesController.deleteRoomTypes,
);
router.get('/global-search', roomTypesController.globalSearch);
router.get('/:id', roomTypesController.getRoomTypesById);
router.get('/', roomTypesController.getAllRoomTypes);

export const roomTypesRoutes = router;
