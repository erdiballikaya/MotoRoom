import { randomUUID } from 'node:crypto';

import { MongoServerError, ObjectId } from 'mongodb';

import { config } from './config.js';
import { getMongoDb } from './mongo.js';
import { postgresPool } from './postgres.js';
import { AuthProvider, AuthUser } from './types.js';

type StoredUser = AuthUser & {
  passwordHash: string | null;
};

type SocialIdentityInput = {
  provider: Extract<AuthProvider, 'google' | 'apple'>;
  providerSubject: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
};

type EmailUserInput = {
  displayName: string;
  email: string;
  city: string;
  passwordHash: string;
};

type AuthStoreContract = {
  initialize: () => Promise<void>;
  createEmailUser: (input: EmailUserInput) => Promise<AuthUser | null>;
  getEmailUserForLogin: (email: string) => Promise<StoredUser | null>;
  getUserById: (userId: string) => Promise<AuthUser | null>;
  findOrCreateSocialUser: (input: SocialIdentityInput) => Promise<AuthUser>;
};

type MemoryIdentity = {
  provider: Extract<AuthProvider, 'google' | 'apple'>;
  providerSubject: string;
  userId: string;
};

type UserRow = {
  id: string;
  email: string | null;
  display_name: string;
  city: string;
  avatar_url: string | null;
  password_hash: string | null;
};

type IdentityRow = {
  provider: Extract<AuthProvider, 'google' | 'apple'>;
  provider_subject: string;
  user_id: string;
};

type MongoUserDocument = StoredUser & {
  normalizedEmail: string | null;
  createdAt: Date;
  _id?: ObjectId;
};

type MongoIdentityDocument = {
  provider: Extract<AuthProvider, 'google' | 'apple'>;
  providerSubject: string;
  userId: string;
  email: string | null;
  normalizedEmail: string | null;
  createdAt: Date;
  _id?: ObjectId;
};

const createUserTablesSql = `
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Belirtilmedi',
  avatar_url TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_lower_email
ON app_users ((LOWER(email)))
WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_auth_identities (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_user_auth_identities_user_id ON user_auth_identities(user_id);
`;

const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase('en-US');

const dedupeProviders = (providers: AuthProvider[]) => Array.from(new Set(providers));

const isDuplicateKeyError = (error: unknown) =>
  error instanceof MongoServerError && error.code === 11000;

const stripPasswordHash = (user: StoredUser): AuthUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  city: user.city,
  avatarUrl: user.avatarUrl,
  providers: user.providers
});

const toAuthUser = (
  row: UserRow,
  identityProviders: Extract<AuthProvider, 'google' | 'apple'>[] = []
): AuthUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  city: row.city,
  avatarUrl: row.avatar_url,
  providers: dedupeProviders([...identityProviders, ...(row.password_hash ? (['email'] as const) : [])])
});

class MemoryAuthStore implements AuthStoreContract {
  private readonly users: StoredUser[] = [];
  private readonly identities: MemoryIdentity[] = [];

  async initialize() {}

  async createEmailUser(input: EmailUserInput): Promise<AuthUser | null> {
    const normalizedEmail = normalizeEmail(input.email);
    const existing = this.users.find((user) => user.email && normalizeEmail(user.email) === normalizedEmail);

    if (existing) {
      return null;
    }

    const user: StoredUser = {
      id: randomUUID(),
      email: normalizedEmail,
      displayName: input.displayName,
      city: input.city,
      avatarUrl: null,
      providers: ['email'],
      passwordHash: input.passwordHash
    };

    this.users.push(user);
    return stripPasswordHash(user);
  }

  async getEmailUserForLogin(email: string): Promise<StoredUser | null> {
    const normalizedEmail = normalizeEmail(email);
    const user = this.users.find((item) => item.email && normalizeEmail(item.email) === normalizedEmail);
    return user ? { ...user } : null;
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = this.users.find((item) => item.id === userId);
    return user ? stripPasswordHash(user) : null;
  }

  async findOrCreateSocialUser(input: SocialIdentityInput): Promise<AuthUser> {
    const identity = this.identities.find(
      (item) => item.provider === input.provider && item.providerSubject === input.providerSubject
    );

    if (identity) {
      const user = this.users.find((item) => item.id === identity.userId);
      if (!user) {
        throw new Error('Linked user not found');
      }

      return stripPasswordHash(user);
    }

    const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
    const existingUser = normalizedEmail
      ? this.users.find((item) => item.email && normalizeEmail(item.email) === normalizedEmail)
      : null;

    const user =
      existingUser ??
      ({
        id: randomUUID(),
        email: normalizedEmail,
        displayName: input.displayName,
        city: 'Belirtilmedi',
        avatarUrl: input.avatarUrl,
        providers: [input.provider],
        passwordHash: null
      } satisfies StoredUser);

    if (!existingUser) {
      this.users.push(user);
    } else {
      user.avatarUrl = user.avatarUrl ?? input.avatarUrl;
      user.providers = dedupeProviders([...user.providers, input.provider]);
    }

    this.identities.push({
      provider: input.provider,
      providerSubject: input.providerSubject,
      userId: user.id
    });

    return stripPasswordHash(user);
  }
}

class PostgresAuthStore implements AuthStoreContract {
  async initialize() {
    if (!postgresPool) {
      return;
    }

    await postgresPool.query(createUserTablesSql);
  }

  private async loadUserWithProviders(userId: string): Promise<StoredUser | null> {
    if (!postgresPool) {
      return null;
    }

    const userResult = await postgresPool.query<UserRow>(
      `
      SELECT id, email, display_name, city, avatar_url, password_hash
      FROM app_users
      WHERE id = $1
      `,
      [userId]
    );

    const userRow = userResult.rows[0];

    if (!userRow) {
      return null;
    }

    const identityResult = await postgresPool.query<Pick<IdentityRow, 'provider'>>(
      `
      SELECT provider
      FROM user_auth_identities
      WHERE user_id = $1
      `,
      [userId]
    );

    const providers = identityResult.rows.map((row) => row.provider);
    return {
      ...toAuthUser(userRow, providers),
      passwordHash: userRow.password_hash
    };
  }

  async createEmailUser(input: EmailUserInput): Promise<AuthUser | null> {
    if (!postgresPool) {
      throw new Error('Postgres pool unavailable');
    }

    const normalizedEmail = normalizeEmail(input.email);
    const existing = await postgresPool.query<{ id: string }>(
      'SELECT id FROM app_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [normalizedEmail]
    );

    if (existing.rowCount) {
      return null;
    }

    const id = randomUUID();
    const result = await postgresPool.query<UserRow>(
      `
      INSERT INTO app_users (id, email, display_name, city, avatar_url, password_hash)
      VALUES ($1, $2, $3, $4, NULL, $5)
      RETURNING id, email, display_name, city, avatar_url, password_hash
      `,
      [id, normalizedEmail, input.displayName, input.city, input.passwordHash]
    );

    return toAuthUser(result.rows[0]);
  }

  async getEmailUserForLogin(email: string): Promise<StoredUser | null> {
    if (!postgresPool) {
      throw new Error('Postgres pool unavailable');
    }

    const result = await postgresPool.query<UserRow>(
      `
      SELECT id, email, display_name, city, avatar_url, password_hash
      FROM app_users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [normalizeEmail(email)]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return this.loadUserWithProviders(row.id);
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await this.loadUserWithProviders(userId);
    return user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          city: user.city,
          avatarUrl: user.avatarUrl,
          providers: user.providers
        }
      : null;
  }

  async findOrCreateSocialUser(input: SocialIdentityInput): Promise<AuthUser> {
    if (!postgresPool) {
      throw new Error('Postgres pool unavailable');
    }

    const client = await postgresPool.connect();

    try {
      await client.query('BEGIN');

      const identityResult = await client.query<IdentityRow>(
        `
        SELECT provider, provider_subject, user_id
        FROM user_auth_identities
        WHERE provider = $1 AND provider_subject = $2
        LIMIT 1
        `,
        [input.provider, input.providerSubject]
      );

      const linkedIdentity = identityResult.rows[0];

      if (linkedIdentity) {
        await client.query('COMMIT');
        const existingUser = await this.getUserById(linkedIdentity.user_id);

        if (!existingUser) {
          throw new Error('Linked user not found');
        }

        return existingUser;
      }

      const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
      let userId: string;

      if (normalizedEmail) {
        const existingUserResult = await client.query<{ id: string }>(
          `
          SELECT id
          FROM app_users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
          `,
          [normalizedEmail]
        );

        userId = existingUserResult.rows[0]?.id ?? '';
      } else {
        userId = '';
      }

      if (!userId) {
        userId = randomUUID();
        await client.query(
          `
          INSERT INTO app_users (id, email, display_name, city, avatar_url, password_hash)
          VALUES ($1, $2, $3, 'Belirtilmedi', $4, NULL)
          `,
          [userId, normalizedEmail, input.displayName, input.avatarUrl]
        );
      } else {
        await client.query(
          `
          UPDATE app_users
          SET
            display_name = COALESCE(display_name, $2),
            avatar_url = COALESCE(avatar_url, $3)
          WHERE id = $1
          `,
          [userId, input.displayName, input.avatarUrl]
        );
      }

      await client.query(
        `
        INSERT INTO user_auth_identities (provider, provider_subject, user_id, email)
        VALUES ($1, $2, $3, $4)
        `,
        [input.provider, input.providerSubject, userId, normalizedEmail]
      );

      await client.query('COMMIT');

      const user = await this.getUserById(userId);

      if (!user) {
        throw new Error('User could not be loaded after social login');
      }

      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

class MongoAuthStore implements AuthStoreContract {
  private async getCollections() {
    const db = await getMongoDb();

    if (!db) {
      throw new Error('Mongo database unavailable');
    }

    return {
      users: db.collection<MongoUserDocument>('app_users'),
      identities: db.collection<MongoIdentityDocument>('user_auth_identities')
    };
  }

  async initialize() {
    const { users, identities } = await this.getCollections();

    await Promise.all([
      users.createIndex(
        { normalizedEmail: 1 },
        {
          unique: true,
          partialFilterExpression: {
            normalizedEmail: { $type: 'string' }
          }
        }
      ),
      identities.createIndex({ provider: 1, providerSubject: 1 }, { unique: true }),
      identities.createIndex({ userId: 1 })
    ]);
  }

  private async loadStoredUser(userId: string): Promise<StoredUser | null> {
    const { users } = await this.getCollections();
    const user = await users.findOne({ id: userId });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      city: user.city,
      avatarUrl: user.avatarUrl,
      providers: user.providers,
      passwordHash: user.passwordHash
    };
  }

  async createEmailUser(input: EmailUserInput): Promise<AuthUser | null> {
    const { users } = await this.getCollections();
    const normalizedEmail = normalizeEmail(input.email);

    try {
      const user: MongoUserDocument = {
        id: randomUUID(),
        email: normalizedEmail,
        displayName: input.displayName,
        city: input.city,
        avatarUrl: null,
        providers: ['email'],
        passwordHash: input.passwordHash,
        normalizedEmail,
        createdAt: new Date()
      };

      await users.insertOne(user);
      return stripPasswordHash(user);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return null;
      }

      throw error;
    }
  }

  async getEmailUserForLogin(email: string): Promise<StoredUser | null> {
    const { users } = await this.getCollections();
    const normalizedEmail = normalizeEmail(email);
    const user = await users.findOne({ normalizedEmail });

    return user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          city: user.city,
          avatarUrl: user.avatarUrl,
          providers: user.providers,
          passwordHash: user.passwordHash
        }
      : null;
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await this.loadStoredUser(userId);
    return user ? stripPasswordHash(user) : null;
  }

  async findOrCreateSocialUser(input: SocialIdentityInput): Promise<AuthUser> {
    const { users, identities } = await this.getCollections();

    const linkedIdentity = await identities.findOne({
      provider: input.provider,
      providerSubject: input.providerSubject
    });

    if (linkedIdentity) {
      const existingUser = await this.getUserById(linkedIdentity.userId);

      if (!existingUser) {
        throw new Error('Linked user not found');
      }

      return existingUser;
    }

    const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
    let user: MongoUserDocument | null = normalizedEmail
      ? await users.findOne({ normalizedEmail }).then((item) => (item ? { ...item } : null))
      : null;

    if (!user) {
      const nextUser = {
        id: randomUUID(),
        email: normalizedEmail,
        displayName: input.displayName,
        city: 'Belirtilmedi',
        avatarUrl: input.avatarUrl,
        providers: [input.provider] as AuthProvider[],
        passwordHash: null,
        normalizedEmail,
        createdAt: new Date()
      };

      try {
        await users.insertOne(nextUser);
        user = nextUser;
      } catch (error) {
        if (!normalizedEmail || !isDuplicateKeyError(error)) {
          throw error;
        }

        user = await users.findOne({ normalizedEmail }).then((item) => (item ? { ...item } : null));
      }
    } else {
      const nextAvatarUrl = user.avatarUrl ?? input.avatarUrl;
      const nextProviders = dedupeProviders([...user.providers, input.provider]);

      await users.updateOne(
        { id: user.id },
        {
          $set: {
            avatarUrl: nextAvatarUrl,
            providers: nextProviders
          }
        }
      );

      user = {
        ...user,
        avatarUrl: nextAvatarUrl,
        providers: nextProviders
      };
    }

    if (!user) {
      throw new Error('User could not be loaded for social login');
    }

    try {
      await identities.insertOne({
        provider: input.provider,
        providerSubject: input.providerSubject,
        userId: user.id,
        email: normalizedEmail,
        normalizedEmail,
        createdAt: new Date()
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const identity = await identities.findOne({
        provider: input.provider,
        providerSubject: input.providerSubject
      });

      if (identity) {
        const existingUser = await this.getUserById(identity.userId);

        if (existingUser) {
          return existingUser;
        }
      }
    }

    const nextUser = await this.getUserById(user.id);

    if (!nextUser) {
      throw new Error('User could not be loaded after social login');
    }

    return nextUser;
  }
}

export const authStore: AuthStoreContract =
  config.mongodbUri ? new MongoAuthStore() : config.databaseUrl && postgresPool ? new PostgresAuthStore() : new MemoryAuthStore();
