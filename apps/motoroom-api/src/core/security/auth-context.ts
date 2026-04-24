import { Request } from 'express';

export type MembershipTier = 'standard' | 'premium';
export type UserRole = 'user' | 'admin';

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  membershipTier: MembershipTier;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

