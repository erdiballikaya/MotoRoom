import { Db, MongoClient } from 'mongodb';

import { env } from '../../config/env.js';

export const createMongoClient = async (): Promise<{ client: MongoClient; db: Db }> => {
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();

  return {
    client,
    db: client.db()
  };
};

