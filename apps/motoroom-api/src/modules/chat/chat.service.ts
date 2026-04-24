import { AppError } from '../../core/errors/app-error.js';
import { AuthenticatedUser } from '../../core/security/auth-context.js';
import { SignedUrlService } from '../../infra/storage/signed-url.service.js';
import { GroupRepository } from '../groups/group.repository.js';
import { GroupService } from '../groups/group.service.js';
import { ChatRepository } from './chat.repository.js';
import { DmRepository } from './dm.repository.js';

const buildConversationKey = (userA: string, userB: string) => {
  const [first, second] = [userA, userB].sort();
  return `dm:${first}:${second}`;
};

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly dmRepository: DmRepository,
    private readonly groupService: GroupService,
    private readonly groupRepository: GroupRepository,
    private readonly signedUrlService: SignedUrlService
  ) {}

  async listGroupMessages(userId: string, groupId: string, input: { before?: Date; limit: number }) {
    await this.groupService.assertActiveMember(userId, groupId);
    return this.chatRepository.listGroupMessages(groupId, input);
  }

  async sendGroupTextMessage(user: AuthenticatedUser, input: {
    groupId: string;
    text: string;
    replyToMessageId?: string | null;
  }) {
    await this.groupService.assertActiveMember(user.id, input.groupId);
    const message = await this.chatRepository.insertGroupTextMessage({
      groupId: input.groupId,
      senderUserId: user.id,
      text: input.text,
      replyToMessageId: input.replyToMessageId
    });
    await this.groupRepository.touchLastActivity(input.groupId);
    return message;
  }

  async prepareGroupMediaUpload(user: AuthenticatedUser, input: {
    groupId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    await this.groupService.assertActiveMember(user.id, input.groupId);
    return this.signedUrlService.prepareUpload({
      ownerUserId: user.id,
      groupId: input.groupId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes
    });
  }

  async deleteOwnMessage(user: AuthenticatedUser, messageId: string) {
    const deleted = await this.chatRepository.deleteOwnGroupMessage(messageId, user.id);

    if (!deleted) {
      throw new AppError('MESSAGE_NOT_FOUND_OR_FORBIDDEN', 'Message cannot be deleted by this user.', 404);
    }
  }

  async requestDm(user: AuthenticatedUser, recipientUserId: string) {
    if (user.membershipTier !== 'premium') {
      throw new AppError('PREMIUM_REQUIRED', 'Only Premium users can request MotoRoom DMs.', 403);
    }

    if (user.id === recipientUserId) {
      throw new AppError('INVALID_DM_RECIPIENT', 'Users cannot request a DM with themselves.', 422);
    }

    await this.dmRepository.requestPermission(user.id, recipientUserId);
  }

  async sendDmTextMessage(user: AuthenticatedUser, input: {
    recipientUserId: string;
    text: string;
    replyToMessageId?: string | null;
  }) {
    if (user.membershipTier !== 'premium') {
      throw new AppError('PREMIUM_REQUIRED', 'Only Premium users can send MotoRoom DMs.', 403);
    }

    const permission = await this.dmRepository.getPermission(user.id, input.recipientUserId);

    if (permission?.status !== 'accepted') {
      throw new AppError('DM_PERMISSION_REQUIRED', 'Recipient must accept the MotoRoom DM request.', 403);
    }

    return this.chatRepository.insertDmTextMessage({
      senderUserId: user.id,
      recipientUserId: input.recipientUserId,
      conversationKey: buildConversationKey(user.id, input.recipientUserId),
      text: input.text,
      replyToMessageId: input.replyToMessageId
    });
  }

  async listDmMessages(user: AuthenticatedUser, otherUserId: string, input: { before?: Date; limit: number }) {
    if (user.membershipTier !== 'premium') {
      throw new AppError('PREMIUM_REQUIRED', 'Only Premium users can read MotoRoom DMs.', 403);
    }

    const permission = await this.dmRepository.getPermission(user.id, otherUserId);

    if (permission?.status !== 'accepted') {
      throw new AppError('DM_PERMISSION_REQUIRED', 'Recipient must accept the MotoRoom DM request.', 403);
    }

    return this.chatRepository.listDmMessages(buildConversationKey(user.id, otherUserId), input);
  }
}
