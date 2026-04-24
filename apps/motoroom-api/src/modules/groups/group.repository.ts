import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';

import {
  ActiveMembershipCounts,
  GroupMembership,
  MembershipStatus,
  VehicleCategory,
  VehicleGroup
} from './group.types.js';

type GroupRow = {
  id: string;
  category: VehicleCategory;
  brand: string;
  model: string;
  generation: string | null;
  slug: string;
  description: string | null;
  is_private: boolean;
  is_featured: boolean;
  member_count: number;
  last_activity_at: Date | null;
  is_joined?: boolean;
};

type MembershipRow = {
  id: string;
  user_id: string;
  group_id: string;
  status: MembershipStatus;
  joined_at: Date;
  left_at: Date | null;
  rejoin_not_before: Date | null;
  unread_count: number;
};

const mapGroup = (row: GroupRow): VehicleGroup & { isJoined?: boolean } => ({
  id: row.id,
  category: row.category,
  brand: row.brand,
  model: row.model,
  generation: row.generation,
  slug: row.slug,
  description: row.description,
  isPrivate: row.is_private,
  isFeatured: row.is_featured,
  memberCount: row.member_count,
  lastActivityAt: row.last_activity_at,
  isJoined: row.is_joined
});

const mapMembership = (row: MembershipRow): GroupMembership => ({
  id: row.id,
  userId: row.user_id,
  groupId: row.group_id,
  status: row.status,
  joinedAt: row.joined_at,
  leftAt: row.left_at,
  rejoinNotBefore: row.rejoin_not_before,
  unreadCount: row.unread_count
});

const slugify = (category: VehicleCategory, brand: string, model: string, generation?: string | null) =>
  [category, brand, model, generation]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export class GroupRepository {
  constructor(private readonly pool: Pool) {}

  async listGroups(input: {
    userId: string;
    category?: VehicleCategory;
    featured?: boolean;
    q?: string;
    limit: number;
  }) {
    const categoryClause = input.category ? 'AND vg.category = $2' : '';
    const featuredClause = input.featured !== undefined ? `AND vg.is_featured = ${input.featured ? 'TRUE' : 'FALSE'}` : '';
    const searchClause = input.q ? `AND (vg.brand ILIKE $${input.category ? 3 : 2} OR vg.model ILIKE $${input.category ? 3 : 2})` : '';
    const limitParam = input.q ? (input.category ? 4 : 3) : input.category ? 3 : 2;
    const values: unknown[] = [input.userId];

    if (input.category) {
      values.push(input.category);
    }

    if (input.q) {
      values.push(`%${input.q}%`);
    }

    values.push(input.limit);

    const result = await this.pool.query<GroupRow>(
      `
      SELECT
        vg.*,
        EXISTS (
          SELECT 1
          FROM group_memberships gm
          WHERE gm.group_id = vg.id
            AND gm.user_id = $1
            AND gm.status = 'active'
        ) AS is_joined
      FROM vehicle_groups vg
      WHERE vg.is_private = FALSE
        ${categoryClause}
        ${featuredClause}
        ${searchClause}
      ORDER BY vg.is_featured DESC, vg.last_activity_at DESC NULLS LAST, vg.member_count DESC
      LIMIT $${limitParam}
      `,
      values
    );

    return result.rows.map(mapGroup);
  }

  async listMyGroups(userId: string) {
    const result = await this.pool.query<GroupRow & { unread_count: number; last_message_preview: string | null }>(
      `
      SELECT vg.*, gm.unread_count, NULL::text AS last_message_preview
      FROM group_memberships gm
      JOIN vehicle_groups vg ON vg.id = gm.group_id
      WHERE gm.user_id = $1 AND gm.status = 'active'
      ORDER BY vg.last_activity_at DESC NULLS LAST, vg.brand ASC, vg.model ASC
      `,
      [userId]
    );

    return result.rows.map((row) => ({
      ...mapGroup(row),
      unreadCount: row.unread_count,
      lastMessagePreview: row.last_message_preview
    }));
  }

  async findById(groupId: string): Promise<VehicleGroup | null> {
    const result = await this.pool.query<GroupRow>('SELECT * FROM vehicle_groups WHERE id = $1 LIMIT 1', [groupId]);
    return result.rows[0] ? mapGroup(result.rows[0]) : null;
  }

  async findMembership(userId: string, groupId: string): Promise<GroupMembership | null> {
    const result = await this.pool.query<MembershipRow>(
      `
      SELECT id, user_id, group_id, status, joined_at, left_at, rejoin_not_before, unread_count
      FROM group_memberships
      WHERE user_id = $1 AND group_id = $2
      LIMIT 1
      `,
      [userId, groupId]
    );

    return result.rows[0] ? mapMembership(result.rows[0]) : null;
  }

  async getActiveMembershipCounts(userId: string): Promise<ActiveMembershipCounts> {
    const result = await this.pool.query<{ category: VehicleCategory; count: string }>(
      `
      SELECT vg.category, COUNT(*)::text AS count
      FROM group_memberships gm
      JOIN vehicle_groups vg ON vg.id = gm.group_id
      WHERE gm.user_id = $1 AND gm.status = 'active'
      GROUP BY vg.category
      `,
      [userId]
    );

    const counts = { total: 0, automobile: 0, motorcycle: 0 };

    for (const row of result.rows) {
      counts[row.category] = Number(row.count);
      counts.total += Number(row.count);
    }

    return counts;
  }

  async activateMembership(userId: string, groupId: string): Promise<GroupMembership> {
    const result = await this.pool.query<MembershipRow>(
      `
      INSERT INTO group_memberships (user_id, group_id, status, joined_at, left_at, rejoin_not_before)
      VALUES ($1, $2, 'active', NOW(), NULL, NULL)
      ON CONFLICT (user_id, group_id)
      DO UPDATE SET status = 'active', joined_at = NOW(), left_at = NULL, rejoin_not_before = NULL
      RETURNING id, user_id, group_id, status, joined_at, left_at, rejoin_not_before, unread_count
      `,
      [userId, groupId]
    );

    await this.pool.query(
      `
      UPDATE vehicle_groups
      SET member_count = member_count + 1, updated_at = NOW()
      WHERE id = $1
      `,
      [groupId]
    );

    return mapMembership(result.rows[0]);
  }

  async leaveMembership(userId: string, groupId: string, rejoinNotBefore: Date | null): Promise<GroupMembership | null> {
    const result = await this.pool.query<MembershipRow>(
      `
      UPDATE group_memberships
      SET status = 'left', left_at = NOW(), rejoin_not_before = $3
      WHERE user_id = $1 AND group_id = $2 AND status = 'active'
      RETURNING id, user_id, group_id, status, joined_at, left_at, rejoin_not_before, unread_count
      `,
      [userId, groupId, rejoinNotBefore]
    );

    if (result.rowCount) {
      await this.pool.query(
        `
        UPDATE vehicle_groups
        SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW()
        WHERE id = $1
        `,
        [groupId]
      );
    }

    return result.rows[0] ? mapMembership(result.rows[0]) : null;
  }

  async createGroup(input: {
    category: VehicleCategory;
    brand: string;
    model: string;
    generation?: string | null;
    description?: string | null;
    isPrivate: boolean;
    createdByUserId: string;
  }): Promise<VehicleGroup> {
    const result = await this.pool.query<GroupRow>(
      `
      INSERT INTO vehicle_groups (
        id, category, brand, model, generation, slug, description, is_private, created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        randomUUID(),
        input.category,
        input.brand,
        input.model,
        input.generation ?? null,
        slugify(input.category, input.brand, input.model, input.generation),
        input.description ?? null,
        input.isPrivate,
        input.createdByUserId
      ]
    );

    return mapGroup(result.rows[0]);
  }

  async touchLastActivity(groupId: string) {
    await this.pool.query('UPDATE vehicle_groups SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1', [
      groupId
    ]);
  }
}

