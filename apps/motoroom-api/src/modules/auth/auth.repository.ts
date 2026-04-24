import { Pool } from 'pg';

type RefreshTokenRow = {
  id: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
};

export class AuthRepository {
  constructor(private readonly pool: Pool) {}

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    await this.pool.query(
      `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_by_ip, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [input.userId, input.tokenHash, input.expiresAt, input.ip ?? null, input.userAgent ?? null]
    );
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const result = await this.pool.query<RefreshTokenRow>(
      `
      SELECT id, user_id, expires_at, revoked_at
      FROM refresh_tokens
      WHERE token_hash = $1
      LIMIT 1
      `,
      [tokenHash]
    );

    return result.rows[0] ?? null;
  }

  async revokeRefreshToken(tokenHash: string) {
    await this.pool.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL
      `,
      [tokenHash]
    );
  }
}

