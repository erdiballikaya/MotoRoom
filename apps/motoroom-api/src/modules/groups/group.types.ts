export type VehicleCategory = 'automobile' | 'motorcycle';
export type MembershipStatus = 'active' | 'left' | 'archived' | 'banned';

export type VehicleGroup = {
  id: string;
  category: VehicleCategory;
  brand: string;
  model: string;
  generation: string | null;
  slug: string;
  description: string | null;
  isPrivate: boolean;
  isFeatured: boolean;
  memberCount: number;
  lastActivityAt: Date | null;
};

export type GroupMembership = {
  id: string;
  userId: string;
  groupId: string;
  status: MembershipStatus;
  joinedAt: Date;
  leftAt: Date | null;
  rejoinNotBefore: Date | null;
  unreadCount: number;
};

export type ActiveMembershipCounts = {
  total: number;
  automobile: number;
  motorcycle: number;
};

