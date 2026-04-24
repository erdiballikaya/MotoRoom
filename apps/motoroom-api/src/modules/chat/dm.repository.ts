import { Pool } from 'pg';

type DmPermissionRow = {
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
};

export class DmRepository {
  constructor(private readonly pool: Pool) {}

  async requestPermission(requesterUserId: string, recipientUserId: string) {
    await this.pool.query(
      `
      INSERT INTO dm_permissions (requester_user_id, recipient_user_id, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT ON CONSTRAINT dm_permissions_pair_unique
      DO UPDATE SET status = 'pending', responded_at = NULL
      `,
      [requesterUserId, recipientUserId]
    );
  }

  async getPermission(userA: string, userB: string): Promise<DmPermissionRow | null> {
    const result = await this.pool.query<DmPermissionRow>(
      `
      SELECT status
      FROM dm_permissions
      WHERE
        (requester_user_id = $1 AND recipient_user_id = $2)
        OR (requester_user_id = $2 AND recipient_user_id = $1)
      LIMIT 1
      `,
      [userA, userB]
    );

    return result.rows[0] ?? null;
  }
}
