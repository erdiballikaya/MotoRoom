import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(80)
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(40)
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(40)
});

