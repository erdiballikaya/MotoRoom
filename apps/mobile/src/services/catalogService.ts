import { appConfig } from '../config';
import { mockCatalog } from '../data/mockCatalog';
import { CatalogData, DataSource, PostMessageInput, RoomMessage } from '../types';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const loadCatalog = async (): Promise<{ catalog: CatalogData; source: DataSource }> => {
  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/catalog`);

    if (!response.ok) {
      throw new Error(`Catalog request failed with ${response.status}`);
    }

    const payload = (await response.json()) as CatalogData;
    return { catalog: payload, source: 'api' };
  } catch {
    await delay(220);
    return { catalog: clone(mockCatalog), source: 'mock' };
  }
};

export const publishMessage = async (
  roomId: string,
  input: PostMessageInput
): Promise<{ message: RoomMessage; source: DataSource }> => {
  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Message request failed with ${response.status}`);
    }

    const payload = (await response.json()) as RoomMessage;
    return { message: payload, source: 'api' };
  } catch {
    await delay(140);

    return {
      source: 'mock',
      message: {
        id: `local-${Date.now()}`,
        authorName: input.authorName,
        city: input.city,
        role: 'Sürücü',
        body: input.body,
        relativeTime: 'Şimdi',
        helpfulCount: 0
      }
    };
  }
};
