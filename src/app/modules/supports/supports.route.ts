import { Router } from 'express';
import { supportsController } from './supports.controller';
import multer, { memoryStorage } from 'multer';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants';

const router = Router();
const uploads = multer({ storage: memoryStorage() });

router.post(
  '/',
  uploads.fields([{ name: 'documents', maxCount: 5 }]),
  supportsController.createSupports,
);

router.delete(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  supportsController.deleteSupports,
);
router.get(
  '/:id',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  supportsController.getSupportsById,
);
router.get(
  '/',
  auth(USER_ROLE.admin, USER_ROLE.sub_admin, USER_ROLE.super_admin),
  supportsController.getAllSupports,
);

export const supportsRoutes = router;
