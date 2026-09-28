import { Router } from 'express';
import multer from 'multer';
import auth from '../../middleware/auth';
import parseData from '../../middleware/parseData';
import { USER_ROLE } from '../user/user.constants';
import { apartmentDraftController as controller } from './apartmentDraft.controller';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const files = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'banner', maxCount: 1 },
]);
router.use(auth(USER_ROLE.hotel_owner));
router.post('/', files, parseData(), controller.createDraft);
router.get('/', controller.getDrafts);
router.get('/:id', controller.getDraftById);
router.patch('/:id', files, parseData(), controller.updateDraft);
router.delete('/:id', controller.deleteDraft);
router.post('/:id/submit', controller.submitDraft);
export const apartmentDraftRoutes = router;
