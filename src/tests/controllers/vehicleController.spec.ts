import { Request, Response, NextFunction } from 'express';
import { VehicleController } from '../../controllers/vehicleController';
import { VehicleRepository } from '../../repositories/vehicleRepository';

jest.mock('../../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));
jest.mock('../../repositories/vehicleRepository');
jest.mock('../../utils/prisma', () => ({
  prisma: {
    vehicle: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('VehicleController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('addVehicle', () => {
    it('should return 201 with the vehicle data on success', async () => {
      mockReq.body = {
        VehicleID: 'V1',
        Capacity: 40,
        Type: 'bus',
        LocationCoordinates: { latitude: 13.8, longitude: 100.6 },
        Speed: 60,
      };
      (VehicleRepository.addVehicle as jest.Mock).mockResolvedValue(undefined);

      await VehicleController.addVehicle(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockReq.body);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if addVehicle throws', async () => {
      mockReq.body = {
        VehicleID: 'V1',
        Capacity: 40,
        Type: 'bus',
        LocationCoordinates: { latitude: 13.8, longitude: 100.6 },
        Speed: 60,
      };
      const error = new Error('DB error');
      (VehicleRepository.addVehicle as jest.Mock).mockRejectedValue(error);

      await VehicleController.addVehicle(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with ZodError for invalid body', async () => {
      mockReq.body = { VehicleID: 'V1' }; // missing required fields

      await VehicleController.addVehicle(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
