# MotoRoom API

MotoRoom API is the scalable backend starting point for the MotoRoom mobile social network. It is a Node.js + TypeScript modular monolith designed to support vehicle-based communities for automobile and motorcycle owners.

## Modules

- `auth`: email/password auth, JWT access tokens, refresh token rotation.
- `users`: current user profile and membership tier projection.
- `groups`: vehicle group discovery, joining, leaving, Premium private group creation.
- `chat`: group messages, DM messages, media upload preparation.
- `realtime`: Socket.IO group rooms, typing, online presence, message events.
- `infra`: PostgreSQL, MongoDB, Redis, object storage adapters.

## Business Rules Covered

- Standard users can join up to 2 automobile groups.
- Standard users can join up to 2 motorcycle groups.
- Standard users can join up to 4 groups total.
- Standard users must wait 24 hours before rejoining a group after leaving.
- Premium users have no group limit and no cooldown.
- Premium users can request and use DMs after recipient approval.
- Premium users can create private groups.

## Local Setup

```bash
cd apps/motoroom-api
cp .env.example .env
npm install
```

Start PostgreSQL, MongoDB, and Redis:

```bash
docker compose -f docker-compose.example.yml up -d motoroom-postgres motoroom-mongo motoroom-redis
```

Run migrations:

```bash
psql "$POSTGRES_URL" -f migrations/001_initial_schema.sql
psql "$POSTGRES_URL" -f migrations/002_seed_vehicle_groups.sql
```

Start the API:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:4100/health
```

## REST API

Base path:

```text
/api/v1
```

Core endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/groups`
- `GET /api/v1/groups/my`
- `GET /api/v1/groups/:id`
- `POST /api/v1/groups/:id/join`
- `POST /api/v1/groups/:id/leave`
- `POST /api/v1/groups`
- `GET /api/v1/groups/search?q=...`
- `GET /api/v1/groups/:id/messages`
- `POST /api/v1/groups/:id/messages`
- `POST /api/v1/groups/:id/media`
- `DELETE /api/v1/messages/:msgId`
- `POST /api/v1/dm/request`
- `GET /api/v1/dm/:userId/messages`
- `POST /api/v1/dm/:userId/messages`

Full design details are in [../../docs/motoroom-technical-design.md](../../docs/motoroom-technical-design.md).

## Socket.IO

Client connects with:

```ts
io('http://localhost:4100', {
  auth: {
    token: accessToken
  }
});
```

Supported events:

- `group:join`
- `group:leave`
- `message:send`
- `message:new`
- `message:delivered`
- `message:read`
- `user:typing`
- `user:online`
- `dm:request`

Room naming:

- Group room: `group:{groupId}`
- DM room: `dm:{sortedUserIds}`

## Notes

This scaffold is intentionally conservative. It keeps the domain modular without forcing early microservices. PostgreSQL and MongoDB are authoritative for durable data; Redis is used for ephemeral state and coordination.

