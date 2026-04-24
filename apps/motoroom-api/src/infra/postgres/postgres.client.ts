import { Pool } from 'pg';

import { env } from '../../config/env.js';

export const createPostgresPool = () =>
  new Pool({
    connectionString: env.POSTGRES_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

export type PostgresPool = ReturnType<typeof createPostgresPool>;

