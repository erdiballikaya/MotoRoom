import { Router } from 'express';

import { asyncHandler } from '../../core/http/async-handler.js';
import { requireAuth } from '../../core/http/auth-middleware.js';
import { AuthenticatedRequest } from '../../core/security/auth-context.js';

export const createUserRouter = () => {
  const router = Router();

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json({ user: (request as AuthenticatedRequest).user });
    })
  );

  return router;
};

