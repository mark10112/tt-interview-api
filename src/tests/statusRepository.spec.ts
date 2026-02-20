import { StatusRepository } from '../repositories/statusRepository';
import { EvacuationStatus } from '../models';
import { redis } from '../utils/config';

jest.mock('../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: {
    on: jest.fn(),
    hgetall: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  },
}));

const mockStatus: EvacuationStatus = {
  ZoneID: 'Z1',
  TotalEvacuated: 60,
  RemainingPeople: 40,
};

const STATUS_KEY = 'evacuation:status';

describe('StatusRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatuses', () => {
    it('should return all statuses parsed from Redis hash', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({
        Z1: JSON.stringify({ ZoneID: 'Z1', TotalEvacuated: 60, RemainingPeople: 40 }),
        Z2: JSON.stringify({ ZoneID: 'Z2', TotalEvacuated: 0, RemainingPeople: 50 }),
      });

      const result = await StatusRepository.getStatuses();

      expect(redis.hgetall).toHaveBeenCalledWith(STATUS_KEY);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          { ZoneID: 'Z1', TotalEvacuated: 60, RemainingPeople: 40 },
          { ZoneID: 'Z2', TotalEvacuated: 0, RemainingPeople: 50 },
        ]),
      );
    });

    it('should return empty array when Redis hash is empty', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({});

      const result = await StatusRepository.getStatuses();

      expect(result).toEqual([]);
    });
  });

  describe('getStatus', () => {
    it('should return the parsed status for a given ZoneID', async () => {
      (redis.hget as jest.Mock).mockResolvedValue(JSON.stringify(mockStatus));

      const result = await StatusRepository.getStatus('Z1');

      expect(redis.hget).toHaveBeenCalledWith(STATUS_KEY, 'Z1');
      expect(result).toEqual({ ZoneID: 'Z1', TotalEvacuated: 60, RemainingPeople: 40 });
    });

    it('should return null when ZoneID does not exist in Redis', async () => {
      (redis.hget as jest.Mock).mockResolvedValue(null);

      const result = await StatusRepository.getStatus('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should serialize and store the status in Redis hash', async () => {
      (redis.hset as jest.Mock).mockResolvedValue(0);

      await StatusRepository.updateStatus(mockStatus);

      expect(redis.hset).toHaveBeenCalledWith(
        STATUS_KEY,
        'Z1',
        JSON.stringify({ ZoneID: 'Z1', TotalEvacuated: 60, RemainingPeople: 40 }),
      );
    });

    it('should overwrite existing status for the same ZoneID', async () => {
      (redis.hset as jest.Mock).mockResolvedValue(0);

      const updatedStatus: EvacuationStatus = { ZoneID: 'Z1', TotalEvacuated: 100, RemainingPeople: 0 };
      await StatusRepository.updateStatus(updatedStatus);

      expect(redis.hset).toHaveBeenCalledWith(
        STATUS_KEY,
        'Z1',
        JSON.stringify({ ZoneID: 'Z1', TotalEvacuated: 100, RemainingPeople: 0 }),
      );
    });
  });

  describe('clearStatuses', () => {
    it('should delete the Redis hash key', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      await StatusRepository.clearStatuses();

      expect(redis.del).toHaveBeenCalledWith(STATUS_KEY);
    });

    it('should not throw when key does not exist (idempotent)', async () => {
      (redis.del as jest.Mock).mockResolvedValue(0);

      await expect(StatusRepository.clearStatuses()).resolves.toBeUndefined();
    });
  });
});
