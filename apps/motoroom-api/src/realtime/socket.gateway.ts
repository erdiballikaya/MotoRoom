import { Server as HttpServer } from 'node:http';

import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import { z } from 'zod';

import { env } from '../config/env.js';
import { AppError } from '../core/errors/app-error.js';
import { verifyAccessToken } from '../core/security/tokens.js';
import { PresenceService } from '../infra/redis/presence.service.js';
import { RedisConnection } from '../infra/redis/redis.client.js';
import { ChatService } from '../modules/chat/chat.service.js';
import { GroupService } from '../modules/groups/group.service.js';

const groupEventSchema = z.object({
  groupId: z.string().uuid()
});

const sendMessageEventSchema = z.object({
  groupId: z.string().uuid(),
  clientMessageId: z.string().min(1).max(120).optional(),
  text: z.string().trim().min(1).max(4000),
  replyToMessageId: z.string().min(1).max(80).nullable().optional()
});

const typingEventSchema = z.object({
  groupId: z.string().uuid(),
  isTyping: z.boolean()
});

const messageStateEventSchema = z.object({
  groupId: z.string().uuid(),
  messageId: z.string().min(1).max(80)
});

const toRoom = (groupId: string) => `group:${groupId}`;

export const createRealtimeGateway = async (
  httpServer: HttpServer,
  deps: {
    redis: RedisConnection;
    presenceService: PresenceService;
    groupService: GroupService;
    chatService: ChatService;
  }
) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : true,
      credentials: true
    }
  });

  const pubClient = deps.redis.duplicate();
  const subClient = deps.redis.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (typeof token !== 'string') {
        throw new AppError('AUTH_REQUIRED', 'Socket auth token is required.', 401);
      }

      socket.data.user = await verifyAccessToken(token);
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error('Socket auth failed.'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    await deps.presenceService.markOnline(user.id, socket.id);
    io.emit('user:online', { userId: user.id, online: true });

    socket.on('group:join', async (payload, ack) => {
      try {
        const event = groupEventSchema.parse(payload);
        await deps.groupService.assertActiveMember(user.id, event.groupId);
        await socket.join(toRoom(event.groupId));
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : 'Join failed.' });
      }
    });

    socket.on('group:leave', async (payload, ack) => {
      try {
        const event = groupEventSchema.parse(payload);
        await socket.leave(toRoom(event.groupId));
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : 'Leave failed.' });
      }
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        const event = sendMessageEventSchema.parse(payload);
        const message = await deps.chatService.sendGroupTextMessage(user, event);
        io.to(toRoom(event.groupId)).emit('message:new', {
          ...message,
          clientMessageId: event.clientMessageId
        });
        ack?.({ ok: true, message });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : 'Message send failed.' });
      }
    });

    socket.on('message:delivered', (payload) => {
      const event = messageStateEventSchema.safeParse(payload);
      if (event.success) {
        socket.to(toRoom(event.data.groupId)).emit('message:delivered', {
          messageId: event.data.messageId,
          userId: user.id
        });
      }
    });

    socket.on('message:read', (payload) => {
      const event = messageStateEventSchema.safeParse(payload);
      if (event.success) {
        socket.to(toRoom(event.data.groupId)).emit('message:read', {
          messageId: event.data.messageId,
          userId: user.id
        });
      }
    });

    socket.on('user:typing', (payload) => {
      const event = typingEventSchema.safeParse(payload);
      if (event.success) {
        socket.to(toRoom(event.data.groupId)).emit('user:typing', {
          groupId: event.data.groupId,
          userId: user.id,
          isTyping: event.data.isTyping
        });
      }
    });

    socket.on('disconnect', async () => {
      const fullyOffline = await deps.presenceService.markOffline(user.id, socket.id);
      if (fullyOffline) {
        io.emit('user:online', { userId: user.id, online: false });
      }
    });
  });

  return io;
};
