import { z } from 'zod';

export const validateBody = <T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> =>
  schema.parse(body);

export const validateQuery = <T extends z.ZodTypeAny>(schema: T, query: unknown): z.infer<T> =>
  schema.parse(query);

export const validateParams = <T extends z.ZodTypeAny>(schema: T, params: unknown): z.infer<T> =>
  schema.parse(params);

