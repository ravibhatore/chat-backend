import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validate.middleware';
import { createUserSchema, userIdParamSchema } from '../validators/user.validator';

const router = Router();

router.post('/create', validate({ body: createUserSchema }), UserController.createUser);
router.get('/', UserController.listUsers);
router.get('/:userId/chats', validate({ params: userIdParamSchema }), UserController.getUserChats);
router.get('/:userId', validate({ params: userIdParamSchema }), UserController.getUser);

export default router;
