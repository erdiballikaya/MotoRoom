import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { errorMiddleware } from './core/http/error-middleware.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createChatRouter } from './modules/chat/chat.routes.js';
import { ChatService } from './modules/chat/chat.service.js';
import { createGroupRouter } from './modules/groups/group.routes.js';
import { GroupService } from './modules/groups/group.service.js';
import { createUserRouter } from './modules/users/user.routes.js';

export const createApp = (deps: {
  authService: AuthService;
  groupService: GroupService;
  chatService: ChatService;
}) => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : true,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ name: 'motoroom-api' }));

  app.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'MotoRoom API' });
  });

  app.use('/api/v1/auth', createAuthRouter(deps.authService));
  app.use('/api/v1/users', createUserRouter());
  app.use('/api/v1/groups', createGroupRouter(deps.groupService));
  app.use('/api/v1', createChatRouter(deps.chatService));
  app.use(errorMiddleware);

  return app;
};
