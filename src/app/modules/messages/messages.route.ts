import { Router } from 'express';
import { messagesController } from './messages.controller';
import validateRequest from '../../middleware/validateRequest';
import { messagesValidation } from './messages.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middleware/parseData';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constants'; 
import fileUpload from '../../middleware/fileUpload';
const upload = fileUpload('./public/uploads/messages');

const router = Router();
// const storage = memoryStorage();
// const upload = multer({ storage });

router.post(
  '/send-messages',
  auth(USER_ROLE.user, USER_ROLE.admin),
  upload.single('image'),
  parseData(),
  validateRequest(messagesValidation.sendMessageValidation),
  messagesController.createMessages,
);

router.patch(
  '/seen/:chatId',
  auth(USER_ROLE.user, USER_ROLE.admin),

  messagesController.seenMessage,
);

router.patch(
  '/update/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  upload.single('image'),
  parseData(),
  validateRequest(messagesValidation.updateMessageValidation),
  messagesController.updateMessages,
);

router.get('/my-messages/:chatId', messagesController.getMessagesByChatId);

router.delete(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  messagesController.deleteMessages,
);

router.get(
  '/:id',
  auth(USER_ROLE.user, USER_ROLE.admin),
  messagesController.getMessagesById,
);

router.get(
  '/',
  auth(USER_ROLE.user, USER_ROLE.admin),
  messagesController.getAllMessages,
);

export const messagesRoutes = router;
