import { Db } from 'mongodb';

export const ensureMessageIndexes = async (db: Db) => {
  await Promise.all([
    db.collection('group_messages').createIndex({ messageId: 1 }, { unique: true }),
    db.collection('group_messages').createIndex({ groupId: 1, createdAt: -1 }),
    db.collection('group_messages').createIndex({ senderUserId: 1, createdAt: -1 }),
    db.collection('dm_messages').createIndex({ messageId: 1 }, { unique: true }),
    db.collection('dm_messages').createIndex({ conversationKey: 1, createdAt: -1 }),
    db.collection('dm_messages').createIndex({ recipientUserId: 1, createdAt: -1 })
  ]);
};

