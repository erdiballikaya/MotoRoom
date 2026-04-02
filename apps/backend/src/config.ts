import 'dotenv/config';

const mongodbUri = process.env.MONGODB_URI?.trim() || null;
const databaseUrl = process.env.DATABASE_URL?.trim() || null;

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri,
  databaseUrl,
  jwtSecret: process.env.JWT_SECRET?.trim() || 'motoroom-dev-secret',
  googleAuthClientIds: (process.env.GOOGLE_AUTH_CLIENT_IDS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  appleAuthAudiences: (process.env.APPLE_AUTH_AUDIENCES ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
};

export const storageMode = mongodbUri ? 'mongo' : databaseUrl ? 'postgres' : 'memory';
