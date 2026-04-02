export type Brand = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
};

export type RideEvent = {
  id: string;
  city: string;
  dateLabel: string;
  title: string;
  attendees: number;
};

export type RoomInsight = {
  title: string;
  detail: string;
};

export type RoomMessage = {
  id: string;
  authorName: string;
  city: string;
  role: string;
  body: string;
  relativeTime: string;
  helpfulCount: number;
  pinned?: boolean;
};

export type Room = {
  id: string;
  brandId: string;
  modelName: string;
  segment: string;
  engine: string;
  memberCount: number;
  ridersOnline: number;
  archivedMessageCount: number;
  cityFocus: string;
  description: string;
  seasonNote: string;
  tags: string[];
  pinnedInsights: RoomInsight[];
  meetups: RideEvent[];
  messages: RoomMessage[];
};

export type CatalogData = {
  updatedAt: string;
  brands: Brand[];
  rooms: Room[];
  highlights: {
    summerTrend: string;
    activeRideCities: string;
    answeredQuestions: string;
  };
};

export type CreateMessageInput = {
  authorName: string;
  city: string;
  body: string;
};

export type AuthProvider = 'email' | 'google' | 'apple';

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string;
  city: string;
  avatarUrl: string | null;
  providers: AuthProvider[];
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type RegisterInput = {
  displayName: string;
  email: string;
  city: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type GoogleSocialLoginInput = {
  idToken: string;
};

export type AppleSocialLoginInput = {
  identityToken: string;
  displayName?: string | null;
  email?: string | null;
};
