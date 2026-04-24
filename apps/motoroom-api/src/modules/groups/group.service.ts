import { AppError } from '../../core/errors/app-error.js';
import { AuthenticatedUser } from '../../core/security/auth-context.js';
import { UserRepository } from '../users/user.repository.js';
import { GroupRepository } from './group.repository.js';
import { VehicleCategory } from './group.types.js';

const standardCategoryLimit = 2;
const standardTotalLimit = 4;
const standardRejoinCooldownHours = 24;

export class GroupService {
  constructor(
    private readonly groups: GroupRepository,
    private readonly users: UserRepository
  ) {}

  async listGroups(input: {
    userId: string;
    category: VehicleCategory | 'all';
    featured?: boolean;
    q?: string;
    limit: number;
  }) {
    return this.groups.listGroups({
      userId: input.userId,
      category: input.category === 'all' ? undefined : input.category,
      featured: input.featured,
      q: input.q,
      limit: input.limit
    });
  }

  async listMyGroups(userId: string) {
    return this.groups.listMyGroups(userId);
  }

  async getGroup(userId: string, groupId: string) {
    const group = await this.groups.findById(groupId);

    if (!group) {
      throw new AppError('GROUP_NOT_FOUND', 'MotoRoom group was not found.', 404);
    }

    const membership = await this.groups.findMembership(userId, groupId);
    return { group, membership };
  }

  async joinGroup(user: AuthenticatedUser, groupId: string) {
    const group = await this.groups.findById(groupId);

    if (!group) {
      throw new AppError('GROUP_NOT_FOUND', 'MotoRoom group was not found.', 404);
    }

    const existingMembership = await this.groups.findMembership(user.id, groupId);

    if (existingMembership?.status === 'active') {
      return existingMembership;
    }

    if (user.membershipTier === 'standard') {
      if (existingMembership?.rejoinNotBefore && existingMembership.rejoinNotBefore > new Date()) {
        throw new AppError(
          'GROUP_COOLDOWN_ACTIVE',
          'Standard users must wait 24 hours before rejoining this group.',
          409,
          { rejoinNotBefore: existingMembership.rejoinNotBefore }
        );
      }

      const counts = await this.groups.getActiveMembershipCounts(user.id);
      const categoryCount = group.category === 'automobile' ? counts.automobile : counts.motorcycle;

      if (counts.total >= standardTotalLimit) {
        throw new AppError('GROUP_LIMIT_EXCEEDED', 'Standard users can join up to 4 MotoRoom groups.', 409);
      }

      if (categoryCount >= standardCategoryLimit) {
        throw new AppError(
          'GROUP_LIMIT_EXCEEDED',
          `Standard users can join up to 2 ${group.category} groups.`,
          409
        );
      }
    }

    return this.groups.activateMembership(user.id, groupId);
  }

  async leaveGroup(user: AuthenticatedUser, groupId: string) {
    const rejoinNotBefore =
      user.membershipTier === 'standard'
        ? new Date(Date.now() + standardRejoinCooldownHours * 60 * 60 * 1000)
        : null;
    const membership = await this.groups.leaveMembership(user.id, groupId, rejoinNotBefore);

    if (!membership) {
      throw new AppError('ACTIVE_MEMBERSHIP_NOT_FOUND', 'User is not an active member of this group.', 404);
    }

    return membership;
  }

  async createGroup(user: AuthenticatedUser, input: {
    category: VehicleCategory;
    brand: string;
    model: string;
    generation?: string | null;
    description?: string | null;
    isPrivate: boolean;
  }) {
    const storedUser = await this.users.findById(user.id);

    if (!storedUser || storedUser.membershipTier !== 'premium') {
      throw new AppError('PREMIUM_REQUIRED', 'Only Premium users can create MotoRoom groups.', 403);
    }

    return this.groups.createGroup({
      ...input,
      createdByUserId: user.id
    });
  }

  async assertActiveMember(userId: string, groupId: string) {
    const membership = await this.groups.findMembership(userId, groupId);

    if (membership?.status !== 'active') {
      throw new AppError('GROUP_MEMBERSHIP_REQUIRED', 'Active MotoRoom group membership is required.', 403);
    }

    return membership;
  }
}

