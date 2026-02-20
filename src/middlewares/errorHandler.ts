import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/config';
import { HttpError } from '../utils/errors';
import { HTTP_STATUS } from '../utils/constants';

export class ErrorHandler {
  static handle(err: unknown, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }

    logger.error(err, 'Unhandled Error');

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : 'An unexpected error occurred.',
    });
  }
}
