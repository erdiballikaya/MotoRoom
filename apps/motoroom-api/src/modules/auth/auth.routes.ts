import { Router } from 'express';

import { asyncHandler } from '../../core/http/async-handler.js';
import { requireAuth } from '../../core/http/auth-middleware.js';
import { validateBody } from '../../core/validation/validate.js';
import { AuthService } from './auth.service.js';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth.schemas.js';

export const createAuthRouter = (authService: AuthService) => {
  const router = Router();

  router.post(
    '/register',
    asyncHandler(async (request, response) => {
      const body = validateBody(registerSchema, request.body);
      const session = await authService.register(body, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
      response.status(201).json(session);
    })
  );

  router.post(
    '/login',
    asyncHandler(async (request, response) => {
      const body = validateBody(loginSchema, request.body);
      response.json(
        await authService.login(body, {
          ip: request.ip,
          userAgent: request.headers['user-agent']
        })
      );
    })
  );

  router.post(
    '/refresh',
    asyncHandler(async (request, response) => {
      const body = validateBody(refreshSchema, request.body);
      response.json(
        await authService.refresh(body.refreshToken, {
          ip: request.ip,
          userAgent: request.headers['user-agent']
        })
      );
    })
  );

  router.post(
    '/logout',
    requireAuth,
    asyncHandler(async (request, response) => {
      const body = validateBody(logoutSchema, request.body);
      await authService.logout(body.refreshToken);
      response.status(204).send();
    })
  );

  return router;
};

