import { NextFunction, Request, Response } from 'express';

type AsyncRoute = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (route: AsyncRoute) => (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(route(request, response, next)).catch(next);
  };

