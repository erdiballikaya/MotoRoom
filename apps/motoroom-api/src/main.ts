import { createServer } from 'node:http';

import { env } from './config/env.js';
import { createApp } from './app.js';
import { createMongoClient } from './infra/mongo/mongo.client.js';
import { createPostgresPool } from './infra/postgres/postgres.client.js';
import { PresenceService } from './infra/redis/presence.service.js';
import { createRedisConnection } from './infra/redis/redis.client.js';
import { SignedUrlService } from './infra/storage/signed-url.service.js';
import { AuthRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { ChatRepository } from './modules/chat/chat.repository.js';
import { DmRepository } from './modules/chat/dm.repository.js';
import { ensureMessageIndexes } from './modules/chat/message.mongo-model.js';
import { ChatService } from './modules/chat/chat.service.js';
import { GroupRepository } from './modules/groups/group.repository.js';
import { GroupService } from './modules/groups/group.service.js';
import { UserRepository } from './modules/users/user.repository.js';
import { createRealtimeGateway } from './realtime/socket.gateway.js';

const bootstrap = async () => {
  const postgres = createPostgresPool();
  await postgres.query('SELECT 1');

  const mongo = await createMongoClient();
  await ensureMessageIndexes(mongo.db);

  const redis = await createRedisConnection();
  const presenceService = new PresenceService(redis);

  const userRepository = new UserRepository(postgres);
  const authRepository = new AuthRepository(postgres);
  const groupRepository = new GroupRepository(postgres);
  const chatRepository = new ChatRepository(mongo.db);
  const dmRepository = new DmRepository(postgres);
  const signedUrlService = new SignedUrlService();

  const authService = new AuthService(authRepository, userRepository);
  const groupService = new GroupService(groupRepository, userRepository);
  const chatService = new ChatService(
    chatRepository,
    dmRepository,
    groupService,
    groupRepository,
    signedUrlService
  );

  const app = createApp({
    authService,
    groupService,
    chatService
  });
  const server = createServer(app);

  await createRealtimeGateway(server, {
    redis,
    presenceService,
    groupService,
    chatService
  });

  server.listen(env.PORT, () => {
    console.log(`MotoRoom API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async () => {
    console.log('Shutting down MotoRoom API...');
    server.close();
    await Promise.allSettled([postgres.end(), mongo.client.close(), redis.quit()]);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

void bootstrap().catch((error) => {
  console.error('MotoRoom API failed to start', error);
  process.exit(1);
});

