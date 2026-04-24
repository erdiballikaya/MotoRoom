import { z } from 'zod';

export const groupMessagesParamsSchema = z.object({
  id: z.string().uuid()
});

export const listMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const sendGroupMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  replyToMessageId: z.string().min(1).max(80).nullable().optional()
});

export const prepareMediaSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().positive()
});

export const deleteMessageParamsSchema = z.object({
  msgId: z.string().min(1).max(80)
});

export const dmUserParamsSchema = z.object({
  userId: z.string().uuid()
});

export const dmRequestSchema = z.object({
  recipientUserId: z.string().uuid()
});

export const sendDmMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  replyToMessageId: z.string().min(1).max(80).nullable().optional()
});

