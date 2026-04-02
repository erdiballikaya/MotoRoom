import { SignJWT, jwtVerify } from 'jose';

import { config } from './config.js';

const secretKey = new TextEncoder().encode(config.jwtSecret);

export const createSessionToken = async (userId: string) =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

export const verifySessionToken = async (token: string) => {
  const { payload } = await jwtVerify(token, secretKey);
  return payload.sub ?? null;
};
