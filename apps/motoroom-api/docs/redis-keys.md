# MotoRoom Redis Key Contract

Redis is ephemeral. PostgreSQL and MongoDB remain authoritative.

## Presence

- `presence:user:{userId}`: hash of `socketId -> connectedAt`.
- TTL: 60 seconds, refreshed while connected.

## Typing

- `typing:group:{groupId}:{userId}`: short-lived flag.
- TTL: 5 seconds.

## Rate Limits

- `rate:auth:{ip}`: login/register attempts.
- `rate:message:{userId}`: group or DM send attempts.
- `rate:media:{userId}`: signed URL creation attempts.

## Cooldown Cache

- `cooldown:user:{userId}:group:{groupId}`: cached `rejoinNotBefore`.
- PostgreSQL `group_memberships.rejoin_not_before` is authoritative.

## Socket.IO

Socket.IO Redis adapter uses pub/sub channels internally so multiple MotoRoom API nodes can broadcast to the same logical rooms.

