import { z } from 'zod';

export const createChatSchema = z.object({
  userAId: z.string().trim().min(1, 'userAId is required'),
  userBId: z.string().trim().min(1, 'userBId is required'),
});

export const createGroupChatSchema = z.object({
  creatorId: z.string().trim().min(1, 'creatorId is required'),
  name: z.string().trim().min(1, 'Group name is required'),
  memberIds: z.array(z.string().trim().min(1)).min(1, 'At least one member must be invited'),
});

export const chatIdParamSchema = z.object({
  chatId: z.string().trim().min(1, 'chatId is required'),
});

export const manageGroupMemberSchema = z.object({
  requesterId: z.string().trim().min(1, 'requesterId is required'),
  userId: z.string().trim().min(1, 'userId is required'),
});
