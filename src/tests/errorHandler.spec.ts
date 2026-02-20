import { NextFunction, Request, Response } from 'express';
import { ErrorHandler } from '../middlewares/errorHandler';
import { logger } from '../utils/config';

jest.mock('../utils/config', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('ErrorHandler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should log the error and return 500 status with error message', () => {
    const error = new Error('Test error message');

    ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(logger.error).toHaveBeenCalledWith(error, 'Unhandled Error');
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'Test error message',
    });
  });

  it('should return default message if error has no message', () => {
    const error = {};

    ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(logger.error).toHaveBeenCalledWith(error, 'Unhandled Error');
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.',
    });
  });
});
