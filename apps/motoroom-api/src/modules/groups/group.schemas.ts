import { z } from 'zod';

export const groupIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const listGroupsQuerySchema = z.object({
  category: z.enum(['automobile', 'motorcycle', 'all']).default('all'),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value ? value === 'true' : undefined)),
  q: z.string().trim().min(2).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30)
});

export const searchGroupsQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  category: z.enum(['automobile', 'motorcycle', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const createGroupSchema = z.object({
  category: z.enum(['automobile', 'motorcycle']),
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  generation: z.string().trim().max(80).optional(),
  isPrivate: z.boolean().default(false),
  description: z.string().trim().max(1000).optional()
});

