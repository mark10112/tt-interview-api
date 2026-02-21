import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { routes } from '../routes';

jest.mock('../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));
jest.mock('../utils/prisma', () => ({
  prisma: {
    zone: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), deleteMany: jest.fn() },
    vehicle: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
    plan: { deleteMany: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('../controllers/evacuationController');
jest.mock('../controllers/vehicleController');
jest.mock('../controllers/zoneController');

function getErrorMiddleware() {
  const routerStack = (routes as any).stack as Array<{ handle?: Function; route?: any }>;
  return routerStack.find(
    (layer) => layer.handle && layer.handle.length === 4,
  )?.handle;
}

describe('routes - handleZodError middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 with validation error details for ZodError', () => {
    const schema = z.object({ ZoneID: z.string() });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    const zodError = (result as any).error as ZodError;

    const errorMiddleware = getErrorMiddleware();
    expect(errorMiddleware).toBeDefined();
    errorMiddleware!(zodError, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      details: zodError.issues,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next for non-ZodError errors', () => {
    const errorMiddleware = getErrorMiddleware();
    expect(errorMiddleware).toBeDefined();

    const genericError = new Error('Some other error');
    errorMiddleware!(genericError, mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(genericError);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
