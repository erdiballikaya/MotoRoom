import { Collection, WithId } from 'mongodb';

import { seedCatalog } from './data/catalog.js';
import { getMongoDb } from './mongo.js';
import { CatalogData, Brand, CreateMessageInput, Room, RoomMessage } from './types.js';

type CatalogMetaDocument = {
  _id: 'catalog';
  updatedAt: string;
  highlights: CatalogData['highlights'];
};

type BrandDocument = Brand & {
  displayOrder: number;
};

type RoomDocument = Room & {
  displayOrder: number;
};

const getRelativeNow = () => 'Şimdi';

const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toBrand = ({ _id: _ignoredId, displayOrder: _ignoredOrder, ...brand }: WithId<BrandDocument>): Brand =>
  brand;

const toRoom = ({ _id: _ignoredId, displayOrder: _ignoredOrder, ...room }: WithId<RoomDocument>): Room => room;

export class MongoCatalogStore {
  private async getCollections(): Promise<{
    meta: Collection<CatalogMetaDocument>;
    brands: Collection<BrandDocument>;
    rooms: Collection<RoomDocument>;
  }> {
    const db = await getMongoDb();

    if (!db) {
      throw new Error('Mongo database unavailable');
    }

    return {
      meta: db.collection<CatalogMetaDocument>('catalog_meta'),
      brands: db.collection<BrandDocument>('brands'),
      rooms: db.collection<RoomDocument>('rooms')
    };
  }

  async initialize(): Promise<void> {
    const { meta, brands, rooms } = await this.getCollections();

    await Promise.all([
      brands.createIndex({ id: 1 }, { unique: true }),
      brands.createIndex({ displayOrder: 1 }),
      rooms.createIndex({ id: 1 }, { unique: true }),
      rooms.createIndex({ brandId: 1, displayOrder: 1 })
    ]);

    await meta.updateOne(
      { _id: 'catalog' },
      {
        $setOnInsert: {
          _id: 'catalog',
          updatedAt: seedCatalog.updatedAt,
          highlights: seedCatalog.highlights
        }
      },
      { upsert: true }
    );

    await brands.bulkWrite(
      seedCatalog.brands.map((brand, index) => ({
        updateOne: {
          filter: { id: brand.id },
          update: { $setOnInsert: { ...brand, displayOrder: index } },
          upsert: true
        }
      }))
    );

    await rooms.bulkWrite(
      seedCatalog.rooms.map((room, index) => ({
        updateOne: {
          filter: { id: room.id },
          update: { $setOnInsert: { ...room, displayOrder: index } },
          upsert: true
        }
      }))
    );
  }

  async getCatalog(): Promise<CatalogData> {
    const { meta, brands, rooms } = await this.getCollections();
    const [catalogMeta, brandDocs, roomDocs] = await Promise.all([
      meta.findOne({ _id: 'catalog' }),
      brands.find().sort({ displayOrder: 1 }).toArray(),
      rooms.find().sort({ displayOrder: 1 }).toArray()
    ]);

    return {
      updatedAt: catalogMeta?.updatedAt ?? seedCatalog.updatedAt,
      highlights: catalogMeta?.highlights ?? seedCatalog.highlights,
      brands: brandDocs.map(toBrand),
      rooms: roomDocs.map(toRoom)
    };
  }

  async getBrands(): Promise<Brand[]> {
    const { brands } = await this.getCollections();
    const brandDocs = await brands.find().sort({ displayOrder: 1 }).toArray();
    return brandDocs.map(toBrand);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const { rooms } = await this.getCollections();
    const room = await rooms.findOne({ id: roomId });
    return room ? toRoom(room) : null;
  }

  async getMessages(roomId: string): Promise<RoomMessage[] | null> {
    const { rooms } = await this.getCollections();
    const room = await rooms.findOne({ id: roomId }, { projection: { _id: 0, messages: 1 } });
    return room?.messages ?? null;
  }

  async addMessage(roomId: string, input: CreateMessageInput): Promise<RoomMessage | null> {
    const { rooms } = await this.getCollections();

    const message: RoomMessage = {
      id: generateMessageId(),
      authorName: input.authorName,
      city: input.city,
      role: 'Sürücü',
      body: input.body,
      relativeTime: getRelativeNow(),
      helpfulCount: 0
    };

    const result = await rooms.updateOne(
      { id: roomId },
      {
        $push: {
          messages: {
            $each: [message],
            $position: 0
          }
        },
        $inc: { archivedMessageCount: 1 }
      }
    );

    return result.matchedCount ? message : null;
  }
}
