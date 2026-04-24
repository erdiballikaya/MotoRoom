import { MembershipTier, UserRole } from '../../core/security/auth-context.js';

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  membershipTier: MembershipTier;
  role: UserRole;
  deletedAt: Date | null;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  membershipTier: MembershipTier;
  role: UserRole;
};

export const toPublicUser = (user: UserRecord): PublicUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  membershipTier: user.membershipTier,
  role: user.role
});

