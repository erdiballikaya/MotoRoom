import { Pool } from 'pg';

import { UserRecord } from './user.types.js';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  membership_tier: 'standard' | 'premium';
  role: 'user' | 'admin';
  deleted_at: Date | null;
};

const mapUser = (row: UserRow): UserRecord => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  displayName: row.display_name,
  membershipTier: row.membership_tier,
  role: row.role,
  deletedAt: row.deleted_at
});

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(userId: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `
      SELECT id, email, password_hash, display_name, membership_tier, role, deleted_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `
      SELECT id, email, password_hash, display_name, membership_tier, role, deleted_at
      FROM users
      WHERE email = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async createEmailUser(input: {
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `
      INSERT INTO users (email, password_hash, display_name)
      VALUES (LOWER($1), $2, $3)
      RETURNING id, email, password_hash, display_name, membership_tier, role, deleted_at
      `,
      [input.email, input.passwordHash, input.displayName]
    );

    return mapUser(result.rows[0]);
  }
}

