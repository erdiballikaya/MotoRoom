import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';

import { authStore } from './authStore.js';
import { createSessionToken, verifySessionToken } from './authToken.js';
import { config, storageMode } from './config.js';
import { catalogStore } from './store.js';
import { verifyAppleIdentityToken, verifyGoogleIdentityToken } from './oauthVerify.js';
import {
  AppleSocialLoginInput,
  CreateMessageInput,
  GoogleSocialLoginInput,
  LoginInput,
  RegisterInput
} from './types.js';

const app = express();
const startupRetryDelayMs = 3000;

const asyncHandler =
  (
    handler: (
      request: express.Request,
      response: express.Response,
      next: express.NextFunction
    ) => Promise<void>
  ) =>
  (request: express.Request, response: express.Response, next: express.NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };

const getBearerToken = (request: express.Request) => {
  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
};

const sendAuthSession = async (response: express.Response, userId: string) => {
  const user = await authStore.getUserById(userId);

  if (!user) {
    response.status(401).json({ error: 'User not found' });
    return;
  }

  const token = await createSessionToken(user.id);
  response.json({ token, user });
};

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'motoroom-backend' });
});

app.post(
  '/api/auth/register',
  asyncHandler(async (request, response) => {
    const body = request.body as Partial<RegisterInput>;
    const payload: RegisterInput = {
      displayName: body.displayName?.trim() ?? '',
      email: body.email?.trim() ?? '',
      city: body.city?.trim() ?? '',
      password: body.password?.trim() ?? ''
    };

    if (
      payload.displayName.length < 2 ||
      payload.email.length < 5 ||
      payload.city.length < 2 ||
      payload.password.length < 6
    ) {
      response.status(400).json({ error: 'displayName, email, city and password are required' });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await authStore.createEmailUser({
      displayName: payload.displayName,
      email: payload.email,
      city: payload.city,
      passwordHash
    });

    if (!user) {
      response.status(409).json({ error: 'Bu e-posta ile zaten bir hesap var' });
      return;
    }

    await sendAuthSession(response, user.id);
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (request, response) => {
    const body = request.body as Partial<LoginInput>;
    const payload: LoginInput = {
      email: body.email?.trim() ?? '',
      password: body.password?.trim() ?? ''
    };

    if (payload.email.length < 5 || payload.password.length < 6) {
      response.status(400).json({ error: 'email and password are required' });
      return;
    }

    const user = await authStore.getEmailUserForLogin(payload.email);

    if (!user?.passwordHash) {
      response.status(401).json({ error: 'E-posta veya şifre hatalı' });
      return;
    }

    const validPassword = await bcrypt.compare(payload.password, user.passwordHash);

    if (!validPassword) {
      response.status(401).json({ error: 'E-posta veya şifre hatalı' });
      return;
    }

    await sendAuthSession(response, user.id);
  })
);

app.post(
  '/api/auth/social/google',
  asyncHandler(async (request, response) => {
    const body = request.body as Partial<GoogleSocialLoginInput>;
    const idToken = body.idToken?.trim() ?? '';

    if (!idToken) {
      response.status(400).json({ error: 'idToken is required' });
      return;
    }

    const googleProfile = await verifyGoogleIdentityToken(idToken);
    const user = await authStore.findOrCreateSocialUser(googleProfile);
    await sendAuthSession(response, user.id);
  })
);

app.post(
  '/api/auth/social/apple',
  asyncHandler(async (request, response) => {
    const body = request.body as Partial<AppleSocialLoginInput>;
    const identityToken = body.identityToken?.trim() ?? '';

    if (!identityToken) {
      response.status(400).json({ error: 'identityToken is required' });
      return;
    }

    const appleProfile = await verifyAppleIdentityToken(identityToken, body.displayName, body.email);
    const user = await authStore.findOrCreateSocialUser(appleProfile);
    await sendAuthSession(response, user.id);
  })
);

app.get(
  '/api/auth/me',
  asyncHandler(async (request, response) => {
    const token = getBearerToken(request);

    if (!token) {
      response.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    const userId = await verifySessionToken(token).catch(() => null);

    if (!userId) {
      response.status(401).json({ error: 'Invalid session token' });
      return;
    }

    const user = await authStore.getUserById(userId);

    if (!user) {
      response.status(401).json({ error: 'User not found' });
      return;
    }

    response.json({ user });
  })
);

app.get(
  '/api/catalog',
  asyncHandler(async (_request, response) => {
    response.json(await catalogStore.getCatalog());
  })
);

app.get(
  '/api/brands',
  asyncHandler(async (_request, response) => {
    response.json(await catalogStore.getBrands());
  })
);

app.get(
  '/api/rooms/:roomId',
  asyncHandler(async (request, response) => {
    const room = await catalogStore.getRoom(request.params.roomId);

    if (!room) {
      response.status(404).json({ error: 'Room not found' });
      return;
    }

    response.json(room);
  })
);

app.get(
  '/api/rooms/:roomId/messages',
  asyncHandler(async (request, response) => {
    const messages = await catalogStore.getMessages(request.params.roomId);

    if (!messages) {
      response.status(404).json({ error: 'Room not found' });
      return;
    }

    response.json(messages);
  })
);

app.post(
  '/api/rooms/:roomId/messages',
  asyncHandler(async (request, response) => {
    const body = request.body as Partial<CreateMessageInput>;
    const payload: CreateMessageInput = {
      authorName: body.authorName?.trim() ?? '',
      city: body.city?.trim() ?? '',
      body: body.body?.trim() ?? ''
    };

    if (payload.authorName.length < 2 || payload.city.length < 2 || payload.body.length < 3) {
      response.status(400).json({ error: 'authorName, city and body are required' });
      return;
    }

    const message = await catalogStore.addMessage(request.params.roomId, payload);

    if (!message) {
      response.status(404).json({ error: 'Room not found' });
      return;
    }

    response.status(201).json(message);
  })
);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

const bootstrap = async () => {
  while (true) {
    try {
      await authStore.initialize();
      await catalogStore.initialize();

      app.listen(config.port, '0.0.0.0', () => {
        console.log(`MotoRoom backend listening on http://localhost:${config.port} (${storageMode})`);
      });

      return;
    } catch (error) {
      console.error('Failed to initialize backend dependencies.', error);

      if (storageMode === 'memory') {
        process.exitCode = 1;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, startupRetryDelayMs));
    }
  }
};

void bootstrap();
