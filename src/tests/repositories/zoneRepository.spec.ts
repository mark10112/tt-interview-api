import { ZoneRepository } from '../../repositories/zoneRepository';
import { EvacuationZone } from '../../models';
import { prisma } from '../../utils/prisma';
import { redis } from '../../utils/config';

jest.mock('../../utils/prisma', () => ({
  prisma: {
    zone: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: {
    on: jest.fn(),
    hset: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
  },
}));

const mockZone: EvacuationZone = {
  ZoneID: 'Z1',
  LocationCoordinates: { latitude: 13.7563, longitude: 100.5018 },
  NumberOfPeople: 100,
  UrgencyLevel: 5,
};

const mockPrismaRow = {
  ZoneID: 'Z1',
  Latitude: 13.7563,
  Longitude: 100.5018,
  NumberOfPeople: 100,
  UrgencyLevel: 5,
};

describe('ZoneRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addZone', () => {
    it('should create a zone in SQLite with flattened coordinates', async () => {
      (prisma.zone.create as jest.Mock).mockResolvedValue(mockPrismaRow);
      (redis.hset as jest.Mock).mockResolvedValue(1);

      await ZoneRepository.addZone(mockZone);

      expect(prisma.zone.create).toHaveBeenCalledWith({
        data: {
          ZoneID: 'Z1',
          Latitude: 13.7563,
          Longitude: 100.5018,
          NumberOfPeople: 100,
          UrgencyLevel: 5,
        },
      });
    });

    it('should initialize evacuation status in Redis with TotalEvacuated=0', async () => {
      (prisma.zone.create as jest.Mock).mockResolvedValue(mockPrismaRow);
      (redis.hset as jest.Mock).mockResolvedValue(1);

      await ZoneRepository.addZone(mockZone);

      expect(redis.hset).toHaveBeenCalledWith(
        'evacuation:status',
        'Z1',
        JSON.stringify({ ZoneID: 'Z1', TotalEvacuated: 0, RemainingPeople: 100 }),
      );
    });

    it('should set RemainingPeople equal to NumberOfPeople on init', async () => {
      (prisma.zone.create as jest.Mock).mockResolvedValue(mockPrismaRow);
      (redis.hset as jest.Mock).mockResolvedValue(1);

      await ZoneRepository.addZone({ ...mockZone, NumberOfPeople: 250 });

      const hsetCall = (redis.hset as jest.Mock).mock.calls[0];
      const status = JSON.parse(hsetCall[2]);
      expect(status.RemainingPeople).toBe(250);
      expect(status.TotalEvacuated).toBe(0);
    });
  });

  describe('getZones', () => {
    it('should return all zones mapped to EvacuationZone with nested LocationCoordinates', async () => {
      (prisma.zone.findMany as jest.Mock).mockResolvedValue([mockPrismaRow]);

      const result = await ZoneRepository.getZones();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ZoneID: 'Z1',
        LocationCoordinates: { latitude: 13.7563, longitude: 100.5018 },
        NumberOfPeople: 100,
        UrgencyLevel: 5,
      });
    });

    it('should return empty array when no zones exist', async () => {
      (prisma.zone.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ZoneRepository.getZones();

      expect(result).toEqual([]);
    });

    it('should map multiple rows correctly', async () => {
      const row2 = { ZoneID: 'Z2', Latitude: 14.0, Longitude: 101.0, NumberOfPeople: 50, UrgencyLevel: 2 };
      (prisma.zone.findMany as jest.Mock).mockResolvedValue([mockPrismaRow, row2]);

      const result = await ZoneRepository.getZones();

      expect(result).toHaveLength(2);
      expect(result[1].ZoneID).toBe('Z2');
      expect(result[1].LocationCoordinates).toEqual({ latitude: 14.0, longitude: 101.0 });
    });
  });

  describe('getZone', () => {
    it('should return the zone when found', async () => {
      (prisma.zone.findUnique as jest.Mock).mockResolvedValue(mockPrismaRow);

      const result = await ZoneRepository.getZone('Z1');

      expect(prisma.zone.findUnique).toHaveBeenCalledWith({ where: { ZoneID: 'Z1' } });
      expect(result).toEqual({
        ZoneID: 'Z1',
        LocationCoordinates: { latitude: 13.7563, longitude: 100.5018 },
        NumberOfPeople: 100,
        UrgencyLevel: 5,
      });
    });

    it('should return null when zone is not found', async () => {
      (prisma.zone.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await ZoneRepository.getZone('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('clearZones', () => {
    it('should call prisma.zone.deleteMany', async () => {
      (prisma.zone.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      await ZoneRepository.clearZones();

      expect(prisma.zone.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
