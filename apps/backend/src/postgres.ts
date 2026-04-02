import { Pool } from 'pg';

import { config } from './config.js';

export const postgresPool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl
    })
  : null;
