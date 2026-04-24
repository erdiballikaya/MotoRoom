import { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error.js';
import { AuthenticatedRequest, MembershipTier } from '../security/auth-context.js';
import { verifyAccessToken } from '../security/tokens.js';

const getBearerToken = (request: Request) => {
  const header = request.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
};

export const requireAuth = async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(request);

    if (!token) {
      throw new AppError('AUTH_REQUIRED', 'Authorization bearer token is required.', 401);
    }

    (request as AuthenticatedRequest).user = await verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireTier =
  (tier: MembershipTier) => (request: Request, _response: Response, next: NextFunction) => {
    const user = (request as AuthenticatedRequest).user;

    if (tier === 'premium' && user.membershipTier !== 'premium') {
      next(new AppError('PREMIUM_REQUIRED', 'This MotoRoom feature requires Premium.', 403));
      return;
    }

    next();
  };

