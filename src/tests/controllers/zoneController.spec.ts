import { Request, Response, NextFunction } from 'express';
import { ZoneController } from '../../controllers/zoneController';
import { ZoneService } from '../../services';
import { HttpError } from '../../utils/errors';

jest.mock('../../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));
jest.mock('../../services/zoneService');

describe('ZoneController', () => {
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

  describe('addZone', () => {
    const validZoneBody = {
      ZoneID: 'Z1',
      LocationCoordinates: { latitude: 13.7563, longitude: 100.5018 },
      NumberOfPeople: 100,
      UrgencyLevel: 5,
    };

    it('should return 201 with zone data on success', async () => {
      mockReq.body = validZoneBody;
      (ZoneService.addZone as jest.Mock).mockResolvedValue(undefined);

      await ZoneController.addZone(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(validZoneBody);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return HttpError status and message when HttpError is thrown', async () => {
      mockReq.body = validZoneBody;
      const httpError = new HttpError(409, 'Zone already exists');
      (ZoneService.addZone as jest.Mock).mockRejectedValue(httpError);

      await ZoneController.addZone(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Zone already exists' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with non-HttpError errors', async () => {
      mockReq.body = validZoneBody;
      const error = new Error('Unexpected error');
      (ZoneService.addZone as jest.Mock).mockRejectedValue(error);

      await ZoneController.addZone(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with ZodError for invalid body', async () => {
      mockReq.body = { ZoneID: 'Z1' }; // missing required fields

      await ZoneController.addZone(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
