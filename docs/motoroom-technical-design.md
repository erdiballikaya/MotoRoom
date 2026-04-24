# MotoRoom Technical Design

## A. High-Level Output

### Product Summary

MotoRoom is a mobile social network for automobile and motorcycle owners. Users choose a vehicle category, join brand/model based communities, exchange technical knowledge, share ownership experiences, send media, and participate in real-time group conversations.

MotoRoom must always be treated as the product, repository, service, package, and documentation name.

### System Architecture

Recommended MVP architecture:

- Mobile app: Flutter for one iOS and Android codebase.
- Backend: Node.js + TypeScript modular monolith.
- API: REST for transactional workflows and Socket.IO for real-time messaging.
- PostgreSQL: users, subscriptions, vehicle groups, memberships, DM permissions, refresh tokens.
- MongoDB: append-heavy chat history for group and DM messages.
- Redis: online presence, typing indicators, cooldown cache, rate limiting, Socket.IO multi-node adapter.
- Object storage: S3-compatible storage with signed upload and download URLs.
- Push notifications: FCM/APNs through a notification adapter.

The backend starts as a modular monolith because the domain is still evolving. Module boundaries are explicit so Auth, Groups, Chat, Media, Notifications, and Billing can later move to independent services without rewriting all business logic.

### Why These Technologies

- Flutter: one UI codebase, consistent interaction model, fast MVP velocity.
- Node.js + TypeScript: strong fit for REST + WebSocket workloads, shared type contracts, productive ecosystem.
- PostgreSQL: relational integrity for membership rules, subscriptions, permissions, and account data.
- MongoDB: flexible, high-volume message documents with efficient room/time indexes.
- Redis: low-latency ephemeral state for presence, rate limits, and Socket.IO coordination.
- S3-compatible storage: scalable media pipeline, private buckets, signed URL security.

Native alternative for later:

- iOS: Swift + SwiftUI.
- Android: Kotlin + Jetpack Compose.

Use native only if MotoRoom needs platform-specific performance, deep OS integrations, or separate platform teams.

### MVP Scope

MVP should include:

- Email/password auth with JWT access token and refresh token.
- Standard and Premium membership tier fields.
- Explore screen with category filter and brand/model search.
- Join/leave vehicle groups with Standard user limits.
- 24-hour rejoin cooldown for Standard users.
- My Groups list sorted by last activity.
- Group chat with text messages over REST + Socket.IO broadcast.
- Media signed URL preparation.
- Typing indicator and online presence.
- Basic push notification hook.

Explicitly defer:

- Payments integration.
- Full moderation console.
- Complex recommendation ranking.
- Advanced media transcoding.
- Native-only app features.

### Phased Roadmap

Phase 0: Foundation

- Modular backend scaffold.
- PostgreSQL migrations.
- MongoDB message models.
- Redis connection and rate limit primitives.
- Flutter project shell and navigation skeleton.

Phase 1: MVP Social Core

- Auth and refresh token flow.
- Explore and My Groups screens.
- Join/leave business rules.
- Group text chat.
- Socket.IO message, typing, delivered, read events.

Phase 2: Media and Notifications

- Signed upload URLs.
- Media message attachments.
- Push notifications for mentions and unread group messages.
- File type and size validation.

Phase 3: Premium

- Subscription provider integration.
- Unlimited groups for Premium users.
- Premium private group creation.
- DM permission request and approval.

Phase 4: Scale and Trust

- API gateway and WAF.
- Moderation pipeline.
- Abuse detection and rate limit tuning.
- Horizontal Socket.IO scaling with Redis adapter.
- Account deletion and data export workflows.

## B. Technical Design

### Backend Folder Structure

```text
apps/motoroom-api/
  src/
    app.ts
    main.ts
    config/
    core/
      errors/
      http/
      security/
      validation/
    infra/
      postgres/
      mongo/
      redis/
      storage/
    modules/
      auth/
      users/
      groups/
      chat/
    realtime/
  migrations/
  docs/
```

Module responsibilities:

- `auth`: register, login, refresh, logout, token persistence.
- `users`: user profile and membership tier.
- `groups`: vehicle groups, memberships, cooldowns, private group checks.
- `chat`: message persistence, media preparation, read/delivered state.
- `realtime`: Socket.IO rooms, event validation, Redis adapter.

### Flutter Mobile Folder Structure

```text
apps/motoroom-mobile/
  lib/
    main.dart
    app/
      motoroom_app.dart
      router.dart
      theme.dart
    core/
      config/
      http/
      auth/
      storage/
      realtime/
      widgets/
    features/
      auth/
        data/
        domain/
        presentation/
      explore/
        data/
        domain/
        presentation/
      groups/
        data/
        domain/
        presentation/
      chat/
        data/
        domain/
        presentation/
      dm/
        data/
        domain/
        presentation/
      media/
        data/
        domain/
        presentation/
```

Recommended Flutter libraries:

- State management: Riverpod or Bloc.
- Routing: go_router.
- HTTP: dio.
- WebSocket: socket_io_client.
- Secure storage: flutter_secure_storage.
- Push: firebase_messaging.

### PostgreSQL Schema

#### `users`

Fields:

- `id UUID PRIMARY KEY`
- `email CITEXT UNIQUE NOT NULL`
- `password_hash TEXT NOT NULL`
- `display_name VARCHAR(80) NOT NULL`
- `membership_tier membership_tier NOT NULL DEFAULT 'standard'`
- `role user_role NOT NULL DEFAULT 'user'`
- `dm_policy dm_policy NOT NULL DEFAULT 'premium_only'`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- `deleted_at TIMESTAMPTZ NULL`

Indexes:

- unique email where `deleted_at IS NULL`
- `(membership_tier)`
- `(deleted_at)`

Relations:

- One user has many memberships, refresh tokens, subscriptions, DM permissions.

Business constraints:

- Soft-deleted users cannot log in.
- Premium checks use `membership_tier = 'premium'`.

#### `vehicle_groups`

Fields:

- `id UUID PRIMARY KEY`
- `category vehicle_category NOT NULL` with `automobile` or `motorcycle`
- `brand VARCHAR(80) NOT NULL`
- `model VARCHAR(120) NOT NULL`
- `generation VARCHAR(80) NULL`
- `slug VARCHAR(180) UNIQUE NOT NULL`
- `description TEXT NULL`
- `is_private BOOLEAN NOT NULL DEFAULT false`
- `is_featured BOOLEAN NOT NULL DEFAULT false`
- `created_by_user_id UUID NULL REFERENCES users(id)`
- `member_count INTEGER NOT NULL DEFAULT 0`
- `last_activity_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

Indexes:

- `(category, brand, model)`
- `(is_featured, last_activity_at DESC)`
- GIN trigram or full-text index for brand/model search.

Business constraints:

- Public vehicle groups are unique by normalized category + brand + model + generation.
- Private groups require Premium creator.

#### `group_memberships`

Fields:

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `group_id UUID NOT NULL REFERENCES vehicle_groups(id)`
- `status membership_status NOT NULL` with `active`, `left`, `archived`, `banned`
- `joined_at TIMESTAMPTZ NOT NULL`
- `left_at TIMESTAMPTZ NULL`
- `rejoin_not_before TIMESTAMPTZ NULL`
- `last_read_message_id TEXT NULL`
- `last_read_at TIMESTAMPTZ NULL`
- `unread_count INTEGER NOT NULL DEFAULT 0`

Indexes:

- unique active membership: `(user_id, group_id) WHERE status = 'active'`
- `(user_id, status)`
- `(group_id, status)`
- `(user_id, rejoin_not_before)`

Business constraints:

- Standard users can have at most 2 active automobile groups.
- Standard users can have at most 2 active motorcycle groups.
- Standard users can have at most 4 active groups total.
- Standard users receive `rejoin_not_before = left_at + 24 hours` on leave.
- Premium users bypass group limits and cooldown.

These limits should be enforced transactionally in the Groups service using row locks or serializable transactions. PostgreSQL partial indexes prevent duplicate active membership, while application logic enforces count-based limits.

#### `dm_permissions`

Fields:

- `id UUID PRIMARY KEY`
- `requester_user_id UUID NOT NULL REFERENCES users(id)`
- `recipient_user_id UUID NOT NULL REFERENCES users(id)`
- `status dm_permission_status NOT NULL` with `pending`, `accepted`, `declined`, `blocked`
- `created_at TIMESTAMPTZ NOT NULL`
- `responded_at TIMESTAMPTZ NULL`

Indexes:

- unique pair: `(least(requester_user_id, recipient_user_id), greatest(...))`
- `(recipient_user_id, status)`
- `(requester_user_id, status)`

Business constraints:

- Requester must be Premium.
- DM messages require accepted permission.
- Recipient can decline or block.

#### `private_groups`

Fields:

- `id UUID PRIMARY KEY`
- `group_id UUID UNIQUE NOT NULL REFERENCES vehicle_groups(id)`
- `owner_user_id UUID NOT NULL REFERENCES users(id)`
- `invite_policy private_group_invite_policy NOT NULL DEFAULT 'owner_approval'`
- `created_at TIMESTAMPTZ NOT NULL`

Business constraints:

- `vehicle_groups.is_private` must be true.
- `owner_user_id` must be Premium when group is created.

#### `subscriptions`

Fields:

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `provider VARCHAR(40) NOT NULL`
- `provider_subscription_id TEXT UNIQUE NOT NULL`
- `status subscription_status NOT NULL`
- `current_period_end TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`

Indexes:

- `(user_id, status)`
- `(current_period_end)`

Business constraints:

- Active subscription sets user tier to Premium.
- Expired subscription returns user to Standard unless another active subscription exists.

#### `refresh_tokens`

Fields:

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL REFERENCES users(id)`
- `token_hash TEXT UNIQUE NOT NULL`
- `expires_at TIMESTAMPTZ NOT NULL`
- `revoked_at TIMESTAMPTZ NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- `created_by_ip INET NULL`
- `user_agent TEXT NULL`

Indexes:

- `(user_id, revoked_at)`
- `(expires_at)`

Business constraints:

- Refresh token rotation revokes the old token.
- Logout revokes the current refresh token.

### MongoDB Collections

#### `group_messages`

Document:

```json
{
  "_id": "ObjectId",
  "messageId": "msg_...",
  "groupId": "uuid",
  "senderUserId": "uuid",
  "type": "text|media|system",
  "text": "message body",
  "media": [
    {
      "storageKey": "groups/{groupId}/...",
      "mimeType": "image/jpeg",
      "sizeBytes": 12345,
      "width": 1280,
      "height": 720
    }
  ],
  "replyToMessageId": "msg_...",
  "reactions": [
    {
      "emoji": "👍",
      "userIds": ["uuid"]
    }
  ],
  "delivery": {
    "deliveredTo": ["uuid"],
    "readBy": ["uuid"]
  },
  "createdAt": "ISODate",
  "editedAt": null,
  "deletedAt": null
}
```

Indexes:

- `{ groupId: 1, createdAt: -1 }`
- `{ messageId: 1 }` unique
- `{ senderUserId: 1, createdAt: -1 }`
- partial TTL or archival index for deleted messages if product policy allows.

Business constraints:

- Sender must be active group member.
- Only sender can delete their own message.
- Deleted messages keep tombstones for reply/read consistency.

#### `dm_messages`

Document:

```json
{
  "_id": "ObjectId",
  "messageId": "dm_...",
  "conversationKey": "dm:{lowerUserId}:{higherUserId}",
  "senderUserId": "uuid",
  "recipientUserId": "uuid",
  "type": "text|media",
  "text": "message body",
  "media": [],
  "replyToMessageId": null,
  "delivery": {
    "deliveredAt": null,
    "readAt": null
  },
  "createdAt": "ISODate",
  "deletedAt": null
}
```

Indexes:

- `{ conversationKey: 1, createdAt: -1 }`
- `{ messageId: 1 }` unique
- `{ recipientUserId: 1, createdAt: -1 }`

Business constraints:

- Sender must be Premium.
- Permission status must be accepted.
- Recipient block status prevents send.

### API Contracts

Common conventions:

- Base path: `/api/v1`
- Auth header: `Authorization: Bearer <accessToken>`
- Error response:

```json
{
  "error": {
    "code": "GROUP_LIMIT_EXCEEDED",
    "message": "Standard users can join up to 2 automobile groups."
  }
}
```

#### Auth

`POST /api/v1/auth/register`

- Auth: public.
- Request:

```json
{
  "email": "rider@motoroom.app",
  "password": "secret123",
  "displayName": "Ada Rider"
}
```

- Validation: email format, password min 8, display name 2-80 chars.
- Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "user": {
    "id": "uuid",
    "email": "rider@motoroom.app",
    "displayName": "Ada Rider",
    "membershipTier": "standard"
  }
}
```

- Errors: `EMAIL_ALREADY_EXISTS`, `VALIDATION_ERROR`.
- Business rules: new accounts start as Standard.

`POST /api/v1/auth/login`

- Auth: public.
- Request:

```json
{
  "email": "rider@motoroom.app",
  "password": "secret123"
}
```

- Response: same as register.
- Errors: `INVALID_CREDENTIALS`, `ACCOUNT_DELETED`.

`POST /api/v1/auth/refresh`

- Auth: public with refresh token body.
- Request:

```json
{
  "refreshToken": "opaque-token"
}
```

- Response:

```json
{
  "accessToken": "new-jwt",
  "refreshToken": "rotated-token"
}
```

- Business rules: rotate refresh token and revoke old hash.

`POST /api/v1/auth/logout`

- Auth: required.
- Request:

```json
{
  "refreshToken": "opaque-token"
}
```

- Response: `204 No Content`.
- Business rules: revoke the refresh token.

#### Groups

`GET /api/v1/groups`

- Auth: required.
- Query: `category=automobile|motorcycle|all`, `featured=true`, `limit`, `cursor`.
- Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "category": "motorcycle",
      "brand": "Yamaha",
      "model": "MT-07",
      "memberCount": 15240,
      "lastActivityAt": "2026-04-25T10:30:00.000Z",
      "isJoined": true,
      "isFeatured": true
    }
  ],
  "nextCursor": null
}
```

- Business rules: private groups are omitted unless the user can access them.

`GET /api/v1/groups/my`

- Auth: required.
- Response includes joined groups sorted by last message.
- Validation: optional `includeArchived=true`.

`GET /api/v1/groups/:id`

- Auth: required.
- Response: group detail and current user membership state.
- Errors: `GROUP_NOT_FOUND`, `GROUP_FORBIDDEN`.

`POST /api/v1/groups/:id/join`

- Auth: required.
- Request: empty JSON.
- Response:

```json
{
  "membership": {
    "groupId": "uuid",
    "status": "active",
    "joinedAt": "2026-04-25T10:30:00.000Z"
  }
}
```

- Business rules:
  - Standard automobile limit: 2.
  - Standard motorcycle limit: 2.
  - Standard total limit: 4.
  - Standard cooldown must be expired.
  - Premium bypasses limits and cooldown.
- Errors: `GROUP_LIMIT_EXCEEDED`, `GROUP_COOLDOWN_ACTIVE`, `GROUP_NOT_FOUND`.

`POST /api/v1/groups/:id/leave`

- Auth: required.
- Response:

```json
{
  "membership": {
    "groupId": "uuid",
    "status": "left",
    "rejoinNotBefore": "2026-04-26T10:30:00.000Z"
  }
}
```

- Business rules: Standard users get 24-hour cooldown.

`POST /api/v1/groups`

- Auth: Premium required.
- Request:

```json
{
  "category": "automobile",
  "brand": "Volvo",
  "model": "S40",
  "generation": "Mk2",
  "isPrivate": true,
  "description": "Volvo S40 owners group"
}
```

- Errors: `PREMIUM_REQUIRED`, `GROUP_ALREADY_EXISTS`.

`GET /api/v1/groups/search?q=...`

- Auth: required.
- Validation: q length 2-80.
- Business rules: results mark `isJoined`.

#### Messages

`GET /api/v1/groups/:id/messages`

- Auth: active group member required.
- Query: `before`, `limit`.
- Response:

```json
{
  "items": [
    {
      "messageId": "msg_123",
      "groupId": "uuid",
      "senderUserId": "uuid",
      "text": "Anyone tried Michelin Road 6?",
      "createdAt": "2026-04-25T10:30:00.000Z"
    }
  ]
}
```

`POST /api/v1/groups/:id/messages`

- Auth: active group member required.
- Request:

```json
{
  "text": "Anyone tried Michelin Road 6?",
  "replyToMessageId": null
}
```

- Validation: text 1-4000 chars.
- Business rules: sender identity comes from token, not request body.

`POST /api/v1/groups/:id/media`

- Auth: active group member required.
- Request:

```json
{
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 524288
}
```

- Response:

```json
{
  "uploadUrl": "https://storage.example.com/signed-put",
  "storageKey": "groups/{groupId}/...",
  "expiresInSeconds": 300
}
```

- Validation: MIME whitelist, size limit, extension match.

`DELETE /api/v1/messages/:msgId`

- Auth: required.
- Business rules: only sender can delete their own message, moderators can delete if role added later.

#### DM

`POST /api/v1/dm/request`

- Auth: Premium required.
- Request:

```json
{
  "recipientUserId": "uuid"
}
```

- Business rules: recipient must accept before messages.

`GET /api/v1/dm/:userId/messages`

- Auth: Premium required.
- Business rules: permission must be accepted.

`POST /api/v1/dm/:userId/messages`

- Auth: Premium required.
- Request:

```json
{
  "text": "Can I ask about your MT-07 setup?"
}
```

- Business rules: accepted permission and no block status.

### WebSocket Event Contracts

Transport: Socket.IO.

Auth:

- Client sends access token in `auth.token`.
- Server validates JWT and attaches `socket.data.user`.

Rooms:

- Group room: `group:{groupId}`
- DM room: `dm:{sortedUserIdA}:{sortedUserIdB}`

Events:

`group:join`

```json
{
  "groupId": "uuid"
}
```

- Server checks active membership before joining Socket.IO room.

`group:leave`

```json
{
  "groupId": "uuid"
}
```

`message:send`

```json
{
  "groupId": "uuid",
  "clientMessageId": "local-123",
  "text": "Hello MotoRoom",
  "replyToMessageId": null
}
```

- Server persists message to MongoDB, updates PostgreSQL group last activity, emits `message:new`.

`message:new`

```json
{
  "messageId": "msg_123",
  "groupId": "uuid",
  "senderUserId": "uuid",
  "text": "Hello MotoRoom",
  "createdAt": "2026-04-25T10:30:00.000Z"
}
```

`message:delivered`

```json
{
  "messageId": "msg_123",
  "groupId": "uuid"
}
```

`message:read`

```json
{
  "messageId": "msg_123",
  "groupId": "uuid"
}
```

`user:typing`

```json
{
  "groupId": "uuid",
  "isTyping": true
}
```

`user:online`

```json
{
  "userId": "uuid",
  "online": true
}
```

`dm:request`

```json
{
  "recipientUserId": "uuid"
}
```

Redis usage:

- `presence:user:{userId}` stores connected socket count and expiry.
- `typing:group:{groupId}:{userId}` expires in 5 seconds.
- `cooldown:user:{userId}:group:{groupId}` caches rejoin cooldown.
- Socket.IO Redis adapter broadcasts events across nodes.

### Auth and Authorization Flow

1. Register or login returns short-lived JWT access token and opaque refresh token.
2. Refresh token is stored hashed in PostgreSQL.
3. Mobile stores both tokens in secure storage.
4. API checks access token on every protected endpoint.
5. Authorization guards check membership tier, group membership, DM permission, and ownership.
6. Refresh rotates tokens and revokes the previous refresh token.
7. Logout revokes current refresh token.

### Cache and Message History Strategy

- PostgreSQL is authoritative for account, membership, subscription, and permission rules.
- MongoDB is authoritative for message history.
- Redis is non-authoritative ephemeral state:
  - presence
  - typing
  - rate limits
  - cooldown hot cache
  - Socket.IO adapter
- Group last activity is denormalized in PostgreSQL for Explore/My Groups sorting.
- Message pagination uses MongoDB cursor pagination by `createdAt` and `messageId`.

## Security and Performance

Security:

- TLS required everywhere.
- JWT access token expiry: 15 minutes.
- Refresh token expiry: 30 days with rotation.
- Rate limit auth, message send, media URL creation, and DM request endpoints.
- File MIME whitelist: images and short videos for MVP.
- Object storage bucket is private; all uploads/downloads use signed URLs.
- Run content moderation asynchronously after upload and before broad notification.
- API Gateway/WAF in front of public API.
- Delete account flow anonymizes relational data and tombstones messages.
- Structured logs with request IDs.
- Metrics: API latency, socket count, message throughput, queue lag.

Performance targets:

- REST API P95 under 200ms for common reads.
- WebSocket event latency under 100ms inside one region.
- Architecture can evolve to 100,000 concurrent connections by horizontally scaling Socket.IO nodes, using Redis adapter, separating chat workers, and moving media/moderation to queues.
