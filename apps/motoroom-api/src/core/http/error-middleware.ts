import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { isAppError } from '../errors/app-error.js';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (isAppError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.flatten()
      }
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected MotoRoom API error.'
    }
  });
};

