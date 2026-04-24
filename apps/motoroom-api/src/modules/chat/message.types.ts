export type MessageType = 'text' | 'media' | 'system';

export type MediaAttachment = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

export type GroupMessage = {
  messageId: string;
  groupId: string;
  senderUserId: string;
  type: MessageType;
  text: string | null;
  media: MediaAttachment[];
  replyToMessageId: string | null;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
};

export type DmMessage = {
  messageId: string;
  conversationKey: string;
  senderUserId: string;
  recipientUserId: string;
  type: MessageType;
  text: string | null;
  media: MediaAttachment[];
  replyToMessageId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
};

