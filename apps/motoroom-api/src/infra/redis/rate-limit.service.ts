import { AppError } from '../../core/errors/app-error.js';
import { RedisConnection } from './redis.client.js';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export class RateLimitService {
  constructor(private readonly redis: RedisConnection) {}

  async consume(options: RateLimitOptions) {
    const current = await this.redis.incr(options.key);

    if (current === 1) {
      await this.redis.expire(options.key, options.windowSeconds);
    }

    if (current > options.limit) {
      throw new AppError('RATE_LIMITED', 'Too many MotoRoom requests. Please slow down.', 429);
    }
  }
}

