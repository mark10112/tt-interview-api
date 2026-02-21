import { Request, Response, NextFunction } from 'express';
import { EvacuationController } from '../../controllers/evacuationController';
import { EvacuationService } from '../../services';
import { HttpError } from '../../utils/errors';

jest.mock('../../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));
jest.mock('../../services/evacuationService');

describe('EvacuationController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('generatePlan', () => {
    it('should return 200 with the generated plan', async () => {
      const mockPlan = [
        { ZoneID: 'Z1', VehicleID: 'V1', ETA: '10 minutes', NumberOfPeople: 40 },
      ];
      (EvacuationService.generatePlan as jest.Mock).mockResolvedValue(mockPlan);

      await EvacuationController.generatePlan(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockPlan);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if generatePlan throws', async () => {
      const error = new Error('DB error');
      (EvacuationService.generatePlan as jest.Mock).mockRejectedValue(error);

      await EvacuationController.generatePlan(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getStatus', () => {
    it('should return 200 with statuses', async () => {
      const mockStatuses = [{ ZoneID: 'Z1', TotalEvacuated: 10, RemainingPeople: 40 }];
      (EvacuationService.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);

      await EvacuationController.getStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStatuses);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if getStatuses throws', async () => {
      const error = new Error('Redis error');
      (EvacuationService.getStatuses as jest.Mock).mockRejectedValue(error);

      await EvacuationController.getStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateStatus', () => {
    it('should return 200 with updated status on success', async () => {
      mockReq.body = { ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 10 };
      const mockStatus = { ZoneID: 'Z1', TotalEvacuated: 10, RemainingPeople: 40 };
      (EvacuationService.updateStatus as jest.Mock).mockResolvedValue(mockStatus);

      await EvacuationController.updateStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockStatus);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return HttpError status and message when HttpError is thrown', async () => {
      mockReq.body = { ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 10 };
      const httpError = new HttpError(404, 'Zone status not found');
      (EvacuationService.updateStatus as jest.Mock).mockRejectedValue(httpError);

      await EvacuationController.updateStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Zone status not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with non-HttpError errors', async () => {
      mockReq.body = { ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 10 };
      const error = new Error('Unexpected error');
      (EvacuationService.updateStatus as jest.Mock).mockRejectedValue(error);

      await EvacuationController.updateStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with ZodError for invalid body', async () => {
      mockReq.body = { ZoneID: 'Z1' }; // missing VehicleID and EvacueesMoved

      await EvacuationController.updateStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should return 204 with no body on success', async () => {
      (EvacuationService.clearAll as jest.Mock).mockResolvedValue(undefined);

      await EvacuationController.clearAll(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if clearAll throws', async () => {
      const error = new Error('DB error');
      (EvacuationService.clearAll as jest.Mock).mockRejectedValue(error);

      await EvacuationController.clearAll(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
