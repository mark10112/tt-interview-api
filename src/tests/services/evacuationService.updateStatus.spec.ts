import { EvacuationService } from '../../services';
import { ZoneRepository, StatusRepository } from '../../repositories';
import { EvacuationStatus, EvacuationZone } from '../../models';
import { HttpError } from '../../utils/errors';
import { redis } from '../../utils/config';

jest.mock('../../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));
jest.mock('../../repositories/zoneRepository');
jest.mock('../../repositories/vehicleRepository');
jest.mock('../../repositories/planRepository');
jest.mock('../../repositories/statusRepository');
jest.mock('../../services/geoService');

describe('EvacuationService - getStatuses, updateStatus, clearAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('getStatuses', () => {
    it('should return all statuses from StatusRepository', async () => {
      const mockStatuses: EvacuationStatus[] = [
        { ZoneID: 'Z1', TotalEvacuated: 10, RemainingPeople: 40 },
        { ZoneID: 'Z2', TotalEvacuated: 0, RemainingPeople: 50 },
      ];
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);

      const result = await EvacuationService.getStatuses();

      expect(StatusRepository.getStatuses).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockStatuses);
    });

    it('should return empty array when no statuses exist', async () => {
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue([]);

      const result = await EvacuationService.getStatuses();

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    const mockZone: EvacuationZone = {
      ZoneID: 'Z1',
      LocationCoordinates: { latitude: 10, longitude: 10 },
      NumberOfPeople: 100,
      UrgencyLevel: 5,
    };

    it('should update and return the status with correct counts', async () => {
      const mockStatus: EvacuationStatus = { ZoneID: 'Z1', TotalEvacuated: 20, RemainingPeople: 80 };
      (StatusRepository.getStatus as jest.Mock).mockResolvedValue(mockStatus);
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(mockZone);
      (StatusRepository.updateStatus as jest.Mock).mockResolvedValue(undefined);

      const result = await EvacuationService.updateStatus({ ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 30 });

      expect(result.TotalEvacuated).toBe(50);
      expect(result.RemainingPeople).toBe(50);
      expect(StatusRepository.updateStatus).toHaveBeenCalledWith(result);
    });

    it('should cap TotalEvacuated at NumberOfPeople', async () => {
      const mockStatus: EvacuationStatus = { ZoneID: 'Z1', TotalEvacuated: 90, RemainingPeople: 10 };
      (StatusRepository.getStatus as jest.Mock).mockResolvedValue(mockStatus);
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(mockZone);
      (StatusRepository.updateStatus as jest.Mock).mockResolvedValue(undefined);

      const result = await EvacuationService.updateStatus({ ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 50 });

      expect(result.TotalEvacuated).toBe(100);
      expect(result.RemainingPeople).toBe(0);
    });

    it('should throw HttpError 404 when status is not found', async () => {
      (StatusRepository.getStatus as jest.Mock).mockResolvedValue(null);
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(mockZone);

      await expect(
        EvacuationService.updateStatus({ ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 10 }),
      ).rejects.toThrow(HttpError);

      await expect(
        EvacuationService.updateStatus({ ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 10 }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should throw HttpError 404 when zone is not found', async () => {
      const mockStatus: EvacuationStatus = { ZoneID: 'Z1', TotalEvacuated: 0, RemainingPeople: 100 };
      (StatusRepository.getStatus as jest.Mock).mockResolvedValue(mockStatus);
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(null);

      await expect(
        EvacuationService.updateStatus({ ZoneID: 'Z1', VehicleID: 'V1', EvacueesMoved: 10 }),
      ).rejects.toThrow(HttpError);
    });
  });

  describe('clearAll', () => {
    it('should clear zones, vehicles, and statuses in parallel', async () => {
      const { ZoneRepository } = require('../../repositories');
      const { VehicleRepository } = require('../../repositories');

      (ZoneRepository.clearZones as jest.Mock).mockResolvedValue(undefined);
      (VehicleRepository.clearVehicles as jest.Mock).mockResolvedValue(undefined);
      (StatusRepository.clearStatuses as jest.Mock).mockResolvedValue(undefined);

      await EvacuationService.clearAll();

      expect(ZoneRepository.clearZones).toHaveBeenCalledTimes(1);
      expect(VehicleRepository.clearVehicles).toHaveBeenCalledTimes(1);
      expect(StatusRepository.clearStatuses).toHaveBeenCalledTimes(1);
    });
  });
});
