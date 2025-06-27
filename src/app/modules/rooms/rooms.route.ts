import { Router } from 'express';
import { roomsController } from './rooms.controller';
import multer, { memoryStorage } from 'multer';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';
import parseData from '../../middleware/parseData';

const router = Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(USER_ROLE.hotel_owner),  
  roomsController.createRooms,
);
router.patch(
  '/:id',
  auth(USER_ROLE.hotel_owner),  
  roomsController.updateRooms,
);
router.delete(
  '/:id',
  auth(
    USER_ROLE.hotel_owner,
    USER_ROLE.admin,
    USER_ROLE.sub_admin,
    USER_ROLE.super_admin,
  ),
  roomsController.deleteRooms,
);
router.get('/:id', roomsController.getRoomsById);
router.get('/', roomsController.getAllRooms);

export const roomsRoutes = router;
