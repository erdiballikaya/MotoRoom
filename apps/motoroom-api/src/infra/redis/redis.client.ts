import { createClient } from 'redis';

import { env } from '../../config/env.js';

export const createRedisConnection = async () => {
  const client = createClient({
    url: env.REDIS_URL
  });

  client.on('error', (error) => {
    console.error('MotoRoom Redis error', error);
  });

  await client.connect();
  return client;
};

export type RedisConnection = Awaited<ReturnType<typeof createRedisConnection>>;

