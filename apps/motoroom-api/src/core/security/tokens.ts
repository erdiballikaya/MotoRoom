import { createHash, randomBytes } from 'node:crypto';

import { jwtVerify, SignJWT } from 'jose';

import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { AuthenticatedUser } from './auth-context.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export const createAccessToken = async (user: AuthenticatedUser) =>
  new SignJWT({
    email: user.email,
    displayName: user.displayName,
    membershipTier: user.membershipTier,
    role: user.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret);

export const verifyAccessToken = async (token: string): Promise<AuthenticatedUser> => {
  const { payload } = await jwtVerify(token, accessSecret).catch(() => {
    throw new AppError('INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.', 401);
  });

  if (!payload.sub || typeof payload.email !== 'string' || typeof payload.displayName !== 'string') {
    throw new AppError('INVALID_ACCESS_TOKEN', 'Access token payload is incomplete.', 401);
  }

  return {
    id: payload.sub,
    email: payload.email,
    displayName: payload.displayName,
    membershipTier: payload.membershipTier === 'premium' ? 'premium' : 'standard',
    role: payload.role === 'admin' ? 'admin' : 'user'
  };
};

export const createRefreshToken = () => randomBytes(48).toString('base64url');

export const hashRefreshToken = (token: string) =>
  createHash('sha256')
    .update(token)
    .update(env.JWT_REFRESH_SECRET)
    .digest('hex');

export const createRefreshExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);
  return expiresAt;
};

export const signSocketHandshakeToken = async (user: AuthenticatedUser) =>
  new SignJWT({ socket: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(refreshSecret);

