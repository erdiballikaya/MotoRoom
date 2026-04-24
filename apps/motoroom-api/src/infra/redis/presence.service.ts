import { RedisConnection } from './redis.client.js';

export class PresenceService {
  constructor(private readonly redis: RedisConnection) {}

  async markOnline(userId: string, socketId: string) {
    const key = `presence:user:${userId}`;
    await this.redis.hSet(key, socketId, String(Date.now()));
    await this.redis.expire(key, 60);
  }

  async markOffline(userId: string, socketId: string) {
    const key = `presence:user:${userId}`;
    await this.redis.hDel(key, socketId);
    const socketCount = await this.redis.hLen(key);

    if (socketCount === 0) {
      await this.redis.del(key);
    }

    return socketCount === 0;
  }

  async isOnline(userId: string) {
    return (await this.redis.exists(`presence:user:${userId}`)) === 1;
  }
}

