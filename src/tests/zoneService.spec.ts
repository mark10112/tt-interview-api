import { ZoneService } from '../services';
import { ZoneRepository } from '../repositories/zoneRepository';
import { EvacuationZone } from '../models';
import { HttpError } from '../utils/errors';

jest.mock('../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));
jest.mock('../repositories/zoneRepository');

const mockZone: EvacuationZone = {
  ZoneID: 'Z1',
  LocationCoordinates: { latitude: 13.7563, longitude: 100.5018 },
  NumberOfPeople: 100,
  UrgencyLevel: 5,
};

describe('ZoneService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addZone', () => {
    it('should add a zone successfully when ZoneID does not exist', async () => {
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(null);
      (ZoneRepository.addZone as jest.Mock).mockResolvedValue(undefined);

      await expect(ZoneService.addZone(mockZone)).resolves.toBeUndefined();

      expect(ZoneRepository.getZone).toHaveBeenCalledWith('Z1');
      expect(ZoneRepository.addZone).toHaveBeenCalledWith(mockZone);
    });

    it('should throw HttpError 409 when ZoneID already exists', async () => {
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(mockZone);

      await expect(ZoneService.addZone(mockZone)).rejects.toThrow(HttpError);
      await expect(ZoneService.addZone(mockZone)).rejects.toMatchObject({
        status: 409,
        message: 'Zone already exists',
      });

      expect(ZoneRepository.addZone).not.toHaveBeenCalled();
    });

    it('should check existence before adding', async () => {
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(null);
      (ZoneRepository.addZone as jest.Mock).mockResolvedValue(undefined);

      await ZoneService.addZone(mockZone);

      const getZoneOrder = (ZoneRepository.getZone as jest.Mock).mock.invocationCallOrder[0];
      const addZoneOrder = (ZoneRepository.addZone as jest.Mock).mock.invocationCallOrder[0];
      expect(getZoneOrder).toBeLessThan(addZoneOrder);
    });

    it('should not call addZone when zone already exists', async () => {
      (ZoneRepository.getZone as jest.Mock).mockResolvedValue(mockZone);

      try {
        await ZoneService.addZone(mockZone);
      } catch {
        // expected
      }

      expect(ZoneRepository.addZone).not.toHaveBeenCalled();
    });
  });
});
