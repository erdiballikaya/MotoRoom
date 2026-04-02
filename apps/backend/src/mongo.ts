import { Db, MongoClient } from 'mongodb';

import { config } from './config.js';

const mongoClient = config.mongodbUri ? new MongoClient(config.mongodbUri) : null;

let databasePromise: Promise<Db> | null = null;

export const getMongoDb = async (): Promise<Db | null> => {
  if (!mongoClient) {
    return null;
  }

  if (!databasePromise) {
    databasePromise = mongoClient
      .connect()
      .then((client) => client.db())
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
};
