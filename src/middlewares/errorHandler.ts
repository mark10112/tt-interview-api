import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/config';

export class ErrorHandler {
  static handle(err: any, req: Request, res: Response, next: NextFunction) {
    logger.error(err, 'Unhandled Error');

    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred.',
    });
  }
}
