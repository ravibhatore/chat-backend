import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
});

export const userIdParamSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
});
