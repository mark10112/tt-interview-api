import { VehicleRepository } from '../repositories/vehicleRepository';
import { Vehicle } from '../models';
import { prisma } from '../utils/prisma';

jest.mock('../utils/prisma', () => ({
  prisma: {
    vehicle: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));

const mockVehicle: Vehicle = {
  VehicleID: 'V1',
  Capacity: 40,
  Type: 'bus',
  LocationCoordinates: { latitude: 13.8, longitude: 100.6 },
  Speed: 60,
};

const mockPrismaRow = {
  VehicleID: 'V1',
  Capacity: 40,
  Type: 'bus',
  Latitude: 13.8,
  Longitude: 100.6,
  Speed: 60,
};

describe('VehicleRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addVehicle', () => {
    it('should create a vehicle in SQLite with flattened coordinates', async () => {
      (prisma.vehicle.create as jest.Mock).mockResolvedValue(mockPrismaRow);

      await VehicleRepository.addVehicle(mockVehicle);

      expect(prisma.vehicle.create).toHaveBeenCalledWith({
        data: {
          VehicleID: 'V1',
          Capacity: 40,
          Type: 'bus',
          Latitude: 13.8,
          Longitude: 100.6,
          Speed: 60,
        },
      });
    });
  });

  describe('getVehicles', () => {
    it('should return all vehicles mapped with nested LocationCoordinates', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockPrismaRow]);

      const result = await VehicleRepository.getVehicles();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        VehicleID: 'V1',
        Capacity: 40,
        Type: 'bus',
        LocationCoordinates: { latitude: 13.8, longitude: 100.6 },
        Speed: 60,
      });
    });

    it('should return empty array when no vehicles exist', async () => {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);

      const result = await VehicleRepository.getVehicles();

      expect(result).toEqual([]);
    });

    it('should map multiple rows correctly', async () => {
      const row2 = { VehicleID: 'V2', Capacity: 20, Type: 'truck', Latitude: 14.0, Longitude: 100.8, Speed: 80 };
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([mockPrismaRow, row2]);

      const result = await VehicleRepository.getVehicles();

      expect(result).toHaveLength(2);
      expect(result[1].VehicleID).toBe('V2');
      expect(result[1].Type).toBe('truck');
      expect(result[1].LocationCoordinates).toEqual({ latitude: 14.0, longitude: 100.8 });
    });
  });

  describe('clearVehicles', () => {
    it('should call prisma.vehicle.deleteMany', async () => {
      (prisma.vehicle.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      await VehicleRepository.clearVehicles();

      expect(prisma.vehicle.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
