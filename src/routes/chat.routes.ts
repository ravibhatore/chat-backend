import { Router } from 'express';
import { z } from 'zod';
import { ChatController } from '../controllers/chat.controller';
import { MessageController } from '../controllers/message.controller';
import { validate } from '../middleware/validate.middleware';
import {
  chatIdParamSchema,
  createChatSchema,
  createGroupChatSchema,
  manageGroupMemberSchema,
} from '../validators/chat.validator';
import {
  deleteMessageSchema,
  editMessageSchema,
  getMessagesQuerySchema,
  lastSeenSchema,
  markReadSchema,
  sendMessageSchema,
} from '../validators/message.validator';

const router = Router();

const messageParamSchema = z.object({
  chatId: z.string().trim().min(1),
  messageId: z.string().trim().min(1),
});

// Direct chat
router.post('/create', validate({ body: createChatSchema }), ChatController.createDirectChat);

// Group chats (bonus)
router.post('/group/create', validate({ body: createGroupChatSchema }), ChatController.createGroupChat);
router.post(
  '/:chatId/members/add',
  validate({ params: chatIdParamSchema, body: manageGroupMemberSchema }),
  ChatController.addMemberToGroup
);
router.post(
  '/:chatId/members/remove',
  validate({ params: chatIdParamSchema, body: manageGroupMemberSchema }),
  ChatController.removeMemberFromGroup
);

// Messages
router.post(
  '/:chatId/message/send',
  validate({ params: chatIdParamSchema, body: sendMessageSchema }),
  MessageController.sendMessage
);

router.get(
  '/:chatId/messages',
  validate({ params: chatIdParamSchema, query: getMessagesQuerySchema }),
  MessageController.getMessages
);

router.post(
  '/:chatId/message/:messageId/read',
  validate({ params: messageParamSchema, body: markReadSchema }),
  MessageController.markMessageRead
);

router.post(
  '/:chatId/lastseen',
  validate({ params: chatIdParamSchema, body: lastSeenSchema }),
  MessageController.updateLastSeen
);

router.put(
  '/:chatId/message/:messageId',
  validate({ params: messageParamSchema, body: editMessageSchema }),
  MessageController.editMessage
);

router.delete(
  '/:chatId/message/:messageId',
  validate({ params: messageParamSchema, body: deleteMessageSchema }),
  MessageController.deleteMessage
);

export default router;
