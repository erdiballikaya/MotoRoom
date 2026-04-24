import { randomUUID } from 'node:crypto';

import { Collection, Db } from 'mongodb';

import { DmMessage, GroupMessage } from './message.types.js';

type GroupMessageDocument = GroupMessage & {
  reactions: Array<{ emoji: string; userIds: string[] }>;
  delivery: {
    deliveredTo: string[];
    readBy: string[];
  };
};

type DmMessageDocument = DmMessage & {
  delivery: {
    deliveredAt: Date | null;
    readAt: Date | null;
  };
};

export class ChatRepository {
  private readonly groupMessages: Collection<GroupMessageDocument>;
  private readonly dmMessages: Collection<DmMessageDocument>;

  constructor(db: Db) {
    this.groupMessages = db.collection<GroupMessageDocument>('group_messages');
    this.dmMessages = db.collection<DmMessageDocument>('dm_messages');
  }

  async listGroupMessages(groupId: string, input: { before?: Date; limit: number }): Promise<GroupMessage[]> {
    const filter = {
      groupId,
      deletedAt: null,
      ...(input.before ? { createdAt: { $lt: input.before } } : {})
    };

    const documents = await this.groupMessages
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .toArray();

    return documents.map(({ reactions: _reactions, delivery: _delivery, ...message }) => message);
  }

  async insertGroupTextMessage(input: {
    groupId: string;
    senderUserId: string;
    text: string;
    replyToMessageId?: string | null;
  }): Promise<GroupMessage> {
    const now = new Date();
    const message: GroupMessageDocument = {
      messageId: `msg_${randomUUID()}`,
      groupId: input.groupId,
      senderUserId: input.senderUserId,
      type: 'text',
      text: input.text,
      media: [],
      replyToMessageId: input.replyToMessageId ?? null,
      reactions: [],
      delivery: {
        deliveredTo: [],
        readBy: []
      },
      createdAt: now,
      editedAt: null,
      deletedAt: null
    };

    await this.groupMessages.insertOne(message);
    const { reactions: _reactions, delivery: _delivery, ...publicMessage } = message;
    return publicMessage;
  }

  async deleteOwnGroupMessage(messageId: string, senderUserId: string) {
    const result = await this.groupMessages.updateOne(
      { messageId, senderUserId, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          text: null,
          media: []
        }
      }
    );

    return result.modifiedCount === 1;
  }

  async insertDmTextMessage(input: {
    senderUserId: string;
    recipientUserId: string;
    conversationKey: string;
    text: string;
    replyToMessageId?: string | null;
  }): Promise<DmMessage> {
    const message: DmMessageDocument = {
      messageId: `dm_${randomUUID()}`,
      conversationKey: input.conversationKey,
      senderUserId: input.senderUserId,
      recipientUserId: input.recipientUserId,
      type: 'text',
      text: input.text,
      media: [],
      replyToMessageId: input.replyToMessageId ?? null,
      delivery: {
        deliveredAt: null,
        readAt: null
      },
      createdAt: new Date(),
      deletedAt: null
    };

    await this.dmMessages.insertOne(message);
    const { delivery: _delivery, ...publicMessage } = message;
    return publicMessage;
  }

  async listDmMessages(conversationKey: string, input: { before?: Date; limit: number }): Promise<DmMessage[]> {
    const documents = await this.dmMessages
      .find({
        conversationKey,
        deletedAt: null,
        ...(input.before ? { createdAt: { $lt: input.before } } : {})
      })
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .toArray();

    return documents.map(({ delivery: _delivery, ...message }) => message);
  }
}
