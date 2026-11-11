import { z } from 'zod';

export const sendMessageSchema = z.object({
  senderId: z.string().trim().min(1, 'senderId is required'),
  text: z.string().trim().min(1, 'Message text cannot be empty'),
});

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  userId: z.string().optional(),
});

export const markReadSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
});

export const lastSeenSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  messageId: z.string().trim().min(1, 'messageId is required'),
});

export const editMessageSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  text: z.string().trim().min(1, 'Text cannot be empty'),
});

export const deleteMessageSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
});
