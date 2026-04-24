import { Router } from 'express';

import { asyncHandler } from '../../core/http/async-handler.js';
import { requireAuth } from '../../core/http/auth-middleware.js';
import { AuthenticatedRequest } from '../../core/security/auth-context.js';
import { validateBody, validateParams, validateQuery } from '../../core/validation/validate.js';
import { createGroupSchema, groupIdParamsSchema, listGroupsQuerySchema, searchGroupsQuerySchema } from './group.schemas.js';
import { GroupService } from './group.service.js';

export const createGroupRouter = (groupService: GroupService) => {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (request, response) => {
      const query = validateQuery(listGroupsQuerySchema, request.query);
      const user = (request as AuthenticatedRequest).user;
      response.json({ items: await groupService.listGroups({ userId: user.id, ...query }) });
    })
  );

  router.get(
    '/search',
    requireAuth,
    asyncHandler(async (request, response) => {
      const query = validateQuery(searchGroupsQuerySchema, request.query);
      const user = (request as AuthenticatedRequest).user;
      response.json({ items: await groupService.listGroups({ userId: user.id, q: query.q, category: query.category, limit: query.limit }) });
    })
  );

  router.get(
    '/my',
    requireAuth,
    asyncHandler(async (request, response) => {
      const user = (request as AuthenticatedRequest).user;
      response.json({ items: await groupService.listMyGroups(user.id) });
    })
  );

  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(groupIdParamsSchema, request.params);
      const user = (request as AuthenticatedRequest).user;
      response.json(await groupService.getGroup(user.id, params.id));
    })
  );

  router.post(
    '/:id/join',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(groupIdParamsSchema, request.params);
      const user = (request as AuthenticatedRequest).user;
      response.status(201).json({ membership: await groupService.joinGroup(user, params.id) });
    })
  );

  router.post(
    '/:id/leave',
    requireAuth,
    asyncHandler(async (request, response) => {
      const params = validateParams(groupIdParamsSchema, request.params);
      const user = (request as AuthenticatedRequest).user;
      response.json({ membership: await groupService.leaveGroup(user, params.id) });
    })
  );

  router.post(
    '/',
    requireAuth,
    asyncHandler(async (request, response) => {
      const body = validateBody(createGroupSchema, request.body);
      const user = (request as AuthenticatedRequest).user;
      response.status(201).json({ group: await groupService.createGroup(user, body) });
    })
  );

  return router;
};

