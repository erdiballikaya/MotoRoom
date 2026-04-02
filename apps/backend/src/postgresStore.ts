import { Pool } from 'pg';

import { seedCatalog } from './data/catalog.js';
import { CatalogData, CreateMessageInput, Room, RoomMessage } from './types.js';

type BrandRow = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
};

type RoomRow = {
  id: string;
  brand_id: string;
  model_name: string;
  segment: string;
  engine: string;
  member_count: number;
  riders_online: number;
  archived_message_count: number;
  city_focus: string;
  description: string;
  season_note: string;
  display_order: number;
};

type RoomTagRow = {
  room_id: string;
  position: number;
  tag: string;
};

type RoomInsightRow = {
  room_id: string;
  position: number;
  title: string;
  detail: string;
};

type RoomEventRow = {
  id: string;
  room_id: string;
  position: number;
  city: string;
  date_label: string;
  title: string;
  attendees: number;
};

type MessageRow = {
  id: string;
  room_id: string;
  author_name: string;
  city: string;
  role: string;
  body: string;
  relative_time: string;
  helpful_count: number;
  pinned: boolean;
  created_at: Date;
};

const createTablesSql = `
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  accent TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  segment TEXT NOT NULL,
  engine TEXT NOT NULL,
  member_count INTEGER NOT NULL,
  riders_online INTEGER NOT NULL,
  archived_message_count INTEGER NOT NULL,
  city_focus TEXT NOT NULL,
  description TEXT NOT NULL,
  season_note TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS room_tags (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (room_id, position)
);

CREATE TABLE IF NOT EXISTS room_insights (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  PRIMARY KEY (room_id, position)
);

CREATE TABLE IF NOT EXISTS room_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  city TEXT NOT NULL,
  date_label TEXT NOT NULL,
  title TEXT NOT NULL,
  attendees INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS room_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  city TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  relative_time TEXT NOT NULL,
  helpful_count INTEGER NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_brand_id ON rooms(brand_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id_created_at ON room_messages(room_id, created_at DESC);
`;

const mapMessage = (row: MessageRow): RoomMessage => ({
  id: row.id,
  authorName: row.author_name,
  city: row.city,
  role: row.role,
  body: row.body,
  relativeTime: row.relative_time,
  helpfulCount: row.helpful_count,
  pinned: row.pinned
});

const hydrateRooms = (
  roomRows: RoomRow[],
  tagRows: RoomTagRow[],
  insightRows: RoomInsightRow[],
  eventRows: RoomEventRow[],
  messageRows: MessageRow[]
): Room[] => {
  const tagsByRoom = new Map<string, RoomTagRow[]>();
  const insightsByRoom = new Map<string, RoomInsightRow[]>();
  const eventsByRoom = new Map<string, RoomEventRow[]>();
  const messagesByRoom = new Map<string, MessageRow[]>();

  for (const row of tagRows) {
    tagsByRoom.set(row.room_id, [...(tagsByRoom.get(row.room_id) ?? []), row]);
  }

  for (const row of insightRows) {
    insightsByRoom.set(row.room_id, [...(insightsByRoom.get(row.room_id) ?? []), row]);
  }

  for (const row of eventRows) {
    eventsByRoom.set(row.room_id, [...(eventsByRoom.get(row.room_id) ?? []), row]);
  }

  for (const row of messageRows) {
    messagesByRoom.set(row.room_id, [...(messagesByRoom.get(row.room_id) ?? []), row]);
  }

  return roomRows
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => ({
      id: row.id,
      brandId: row.brand_id,
      modelName: row.model_name,
      segment: row.segment,
      engine: row.engine,
      memberCount: row.member_count,
      ridersOnline: row.riders_online,
      archivedMessageCount: row.archived_message_count,
      cityFocus: row.city_focus,
      description: row.description,
      seasonNote: row.season_note,
      tags: (tagsByRoom.get(row.id) ?? []).sort((a, b) => a.position - b.position).map((item) => item.tag),
      pinnedInsights: (insightsByRoom.get(row.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((item) => ({ title: item.title, detail: item.detail })),
      meetups: (eventsByRoom.get(row.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          city: item.city,
          dateLabel: item.date_label,
          title: item.title,
          attendees: item.attendees
        })),
      messages: (messagesByRoom.get(row.id) ?? []).map(mapMessage)
    }));
};

const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class PostgresCatalogStore {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(createTablesSql);

    const { rows } = await this.pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM brands');

    if (rows[0]?.count !== '0') {
      return;
    }

    await this.seed();
  }

  private async seed(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const brand of seedCatalog.brands) {
        await client.query(
          `
          INSERT INTO brands (id, name, subtitle, accent)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
          `,
          [brand.id, brand.name, brand.subtitle, brand.accent]
        );
      }

      for (const [roomIndex, room] of seedCatalog.rooms.entries()) {
        await client.query(
          `
          INSERT INTO rooms (
            id, brand_id, model_name, segment, engine, member_count, riders_online,
            archived_message_count, city_focus, description, season_note, display_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
          `,
          [
            room.id,
            room.brandId,
            room.modelName,
            room.segment,
            room.engine,
            room.memberCount,
            room.ridersOnline,
            room.archivedMessageCount,
            room.cityFocus,
            room.description,
            room.seasonNote,
            roomIndex
          ]
        );

        for (const [tagIndex, tag] of room.tags.entries()) {
          await client.query(
            `
            INSERT INTO room_tags (room_id, position, tag)
            VALUES ($1, $2, $3)
            ON CONFLICT (room_id, position) DO NOTHING
            `,
            [room.id, tagIndex, tag]
          );
        }

        for (const [insightIndex, insight] of room.pinnedInsights.entries()) {
          await client.query(
            `
            INSERT INTO room_insights (room_id, position, title, detail)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (room_id, position) DO NOTHING
            `,
            [room.id, insightIndex, insight.title, insight.detail]
          );
        }

        for (const [eventIndex, event] of room.meetups.entries()) {
          await client.query(
            `
            INSERT INTO room_events (id, room_id, position, city, date_label, title, attendees)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING
            `,
            [event.id, room.id, eventIndex, event.city, event.dateLabel, event.title, event.attendees]
          );
        }

        for (const [messageIndex, message] of room.messages.entries()) {
          await client.query(
            `
            INSERT INTO room_messages (
              id, room_id, author_name, city, role, body, relative_time, helpful_count, pinned, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - ($10::int * INTERVAL '1 minute'))
            ON CONFLICT (id) DO NOTHING
            `,
            [
              message.id,
              room.id,
              message.authorName,
              message.city,
              message.role,
              message.body,
              message.relativeTime,
              message.helpfulCount,
              Boolean(message.pinned),
              messageIndex
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCatalog(): Promise<CatalogData> {
    const [brandResult, roomResult, tagResult, insightResult, eventResult, messageResult] = await Promise.all([
      this.pool.query<BrandRow>('SELECT id, name, subtitle, accent FROM brands ORDER BY name ASC'),
      this.pool.query<RoomRow>('SELECT * FROM rooms ORDER BY display_order ASC'),
      this.pool.query<RoomTagRow>('SELECT room_id, position, tag FROM room_tags ORDER BY room_id, position ASC'),
      this.pool.query<RoomInsightRow>('SELECT room_id, position, title, detail FROM room_insights ORDER BY room_id, position ASC'),
      this.pool.query<RoomEventRow>('SELECT id, room_id, position, city, date_label, title, attendees FROM room_events ORDER BY room_id, position ASC'),
      this.pool.query<MessageRow>(
        'SELECT id, room_id, author_name, city, role, body, relative_time, helpful_count, pinned, created_at FROM room_messages ORDER BY room_id, created_at DESC'
      )
    ]);

    return {
      updatedAt: seedCatalog.updatedAt,
      highlights: seedCatalog.highlights,
      brands: brandResult.rows.map((brand) => ({
        id: brand.id,
        name: brand.name,
        subtitle: brand.subtitle,
        accent: brand.accent
      })),
      rooms: hydrateRooms(roomResult.rows, tagResult.rows, insightResult.rows, eventResult.rows, messageResult.rows)
    };
  }

  async getBrands() {
    const { rows } = await this.pool.query<BrandRow>('SELECT id, name, subtitle, accent FROM brands ORDER BY name ASC');

    return rows.map((brand) => ({
      id: brand.id,
      name: brand.name,
      subtitle: brand.subtitle,
      accent: brand.accent
    }));
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const catalog = await this.getCatalog();
    return catalog.rooms.find((room) => room.id === roomId) ?? null;
  }

  async getMessages(roomId: string): Promise<RoomMessage[] | null> {
    const { rowCount } = await this.pool.query('SELECT 1 FROM rooms WHERE id = $1', [roomId]);

    if (!rowCount) {
      return null;
    }

    const { rows } = await this.pool.query<MessageRow>(
      `
      SELECT id, room_id, author_name, city, role, body, relative_time, helpful_count, pinned, created_at
      FROM room_messages
      WHERE room_id = $1
      ORDER BY created_at DESC
      `,
      [roomId]
    );

    return rows.map(mapMessage);
  }

  async addMessage(roomId: string, input: CreateMessageInput): Promise<RoomMessage | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const roomExists = await client.query('SELECT id FROM rooms WHERE id = $1', [roomId]);

      if (!roomExists.rowCount) {
        await client.query('ROLLBACK');
        return null;
      }

      const id = generateMessageId();
      const { rows } = await client.query<MessageRow>(
        `
        INSERT INTO room_messages (
          id, room_id, author_name, city, role, body, relative_time, helpful_count, pinned
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'Şimdi', 0, FALSE)
        RETURNING id, room_id, author_name, city, role, body, relative_time, helpful_count, pinned, created_at
        `,
        [id, roomId, input.authorName, input.city, 'Sürücü', input.body]
      );

      await client.query(
        `
        UPDATE rooms
        SET archived_message_count = archived_message_count + 1
        WHERE id = $1
        `,
        [roomId]
      );

      await client.query('COMMIT');
      return mapMessage(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
