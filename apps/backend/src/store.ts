import { seedCatalog } from './data/catalog.js';
import { config } from './config.js';
import { MongoCatalogStore } from './mongoCatalogStore.js';
import { postgresPool } from './postgres.js';
import { PostgresCatalogStore } from './postgresStore.js';
import { CatalogData, CreateMessageInput, Room, RoomMessage } from './types.js';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const catalog = clone(seedCatalog);

const getRelativeNow = () => 'Şimdi';

const findRoom = (roomId: string): Room | undefined => catalog.rooms.find((room) => room.id === roomId);

const memoryStore = {
  async initialize(): Promise<void> {},
  async getCatalog(): Promise<CatalogData> {
    return clone(catalog);
  },
  async getBrands() {
    return clone(catalog.brands);
  },
  async getRoom(roomId: string) {
    const room = findRoom(roomId);
    return room ? clone(room) : null;
  },
  async getMessages(roomId: string) {
    const room = findRoom(roomId);
    return room ? clone(room.messages) : null;
  },
  async addMessage(roomId: string, input: CreateMessageInput): Promise<RoomMessage | null> {
    const room = findRoom(roomId);

    if (!room) {
      return null;
    }

    const message: RoomMessage = {
      id: `msg-${Date.now()}`,
      authorName: input.authorName,
      city: input.city,
      role: 'Sürücü',
      body: input.body,
      relativeTime: getRelativeNow(),
      helpfulCount: 0
    };

    room.messages.unshift(message);
    room.archivedMessageCount += 1;

    return clone(message);
  }
};

export const catalogStore =
  config.mongodbUri
    ? new MongoCatalogStore()
    : config.databaseUrl && postgresPool
      ? new PostgresCatalogStore(postgresPool)
      : memoryStore;
