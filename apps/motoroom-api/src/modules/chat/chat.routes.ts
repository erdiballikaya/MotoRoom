import { Router } from 'express';

import { asyncHandler } from '../../core/http/async-handler.js';
import { requireAuth } from '../../core/http/auth-middleware.js';
import { AuthenticatedRequest } from '../../core/security/auth-context.js';
import { validateBody, validateParams, validateQuery } from '../../core/validation/validate.js';
import {
  deleteMessageParamsSchema,
  dmRequestSchema,
  dmUserParamsSchema,
  groupMessagesParamsSchema,
  listMessagesQuerySchema,
  prepareMediaSchema,
  sendDmMessageSchema,
  sendGroupMessageSchema
} from './chat.schemas.js';
import { ChatService } from './chat.service.js';

export const createChatRouter = (chatService: ChatService) => {
  const router = Router();

  router.get(
    '/groups/:id/messages',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(groupMessagesParamsSchema, request.params);
      const query = validateQuery(listMessagesQuerySchema, request.query);
      const user = (request as AuthenticatedRequest).user;
      response.json({
        items: await chatService.listGroupMessages(user.id, params.id, {
          before: query.before ? new Date(query.before) : undefined,
          limit: query.limit
        })
      });
    })
  );

  router.post(
    '/groups/:id/messages',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(groupMessagesParamsSchema, request.params);
      const body = validateBody(sendGroupMessageSchema, request.body);
      const user = (request as AuthenticatedRequest).user;
      response.status(201).json({
        message: await chatService.sendGroupTextMessage(user, {
          groupId: params.id,
          ...body
        })
      });
    })
  );

  router.post(
    '/groups/:id/media',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(groupMessagesParamsSchema, request.params);
      const body = validateBody(prepareMediaSchema, request.body);
      const user = (request as AuthenticatedRequest).user;
      response.status(201).json(await chatService.prepareGroupMediaUpload(user, { groupId: params.id, ...body }));
    })
  );

  router.delete(
    '/messages/:msgId',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(deleteMessageParamsSchema, request.params);
      const user = (request as AuthenticatedRequest).user;
      await chatService.deleteOwnMessage(user, params.msgId);
      response.status(204).send();
    })
  );

  router.post(
    '/dm/request',
    requireAuth,
    asyncHandler(async (request, response) => {
      const body = validateBody(dmRequestSchema, request.body);
      const user = (request as AuthenticatedRequest).user;
      await chatService.requestDm(user, body.recipientUserId);
      response.status(202).json({ status: 'pending' });
    })
  );

  router.get(
    '/dm/:userId/messages',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(dmUserParamsSchema, request.params);
      const query = validateQuery(listMessagesQuerySchema, request.query);
      const user = (request as AuthenticatedRequest).user;
      response.json({
        items: await chatService.listDmMessages(user, params.userId, {
          before: query.before ? new Date(query.before) : undefined,
          limit: query.limit
        })
      });
    })
  );

  router.post(
    '/dm/:userId/messages',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(dmUserParamsSchema, request.params);
      const body = validateBody(sendDmMessageSchema, request.body);
      const user = (request as AuthenticatedRequest).user;
      response.status(201).json({
        message: await chatService.sendDmTextMessage(user, {
          recipientUserId: params.userId,
          ...body
        })
      });
    })
  );

  return router;
};
