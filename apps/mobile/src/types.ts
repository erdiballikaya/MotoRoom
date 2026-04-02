export type Brand = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
};

export type RoomInsight = {
  title: string;
  detail: string;
};

export type RideEvent = {
  id: string;
  city: string;
  dateLabel: string;
  title: string;
  attendees: number;
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

export type CatalogHighlights = {
  summerTrend: string;
  activeRideCities: string;
  answeredQuestions: string;
};

export type CatalogData = {
  updatedAt: string;
  brands: Brand[];
  rooms: Room[];
  highlights: CatalogHighlights;
};

export type PostMessageInput = {
  authorName: string;
  city: string;
  body: string;
};

export type DataSource = 'api' | 'mock';

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

export type AuthMode = 'login' | 'register';

export type EmailRegisterInput = {
  displayName: string;
  email: string;
  city: string;
  password: string;
};

export type EmailLoginInput = {
  email: string;
  password: string;
};
