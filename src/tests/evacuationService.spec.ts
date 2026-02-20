import { EvacuationService } from '../services/evacuationService';
import { DataRepository } from '../repositories/dataRepository';
import { GeoService } from '../services/geoService';
import { EvacuationZone, Vehicle, EvacuationStatus } from '../models/schemas';

jest.mock('../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() }
}));
jest.mock('../repositories/dataRepository');
jest.mock('../services/geoService');

describe('EvacuationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Disconnect Redis to avoid jest process hanging
    const { redis } = require('../utils/config');
    await redis.quit();
  });

  describe('generatePlan', () => {
    it('should assign a vehicle to the most urgent zone', async () => {
      const mockZones: EvacuationZone[] = [
        {
          ZoneID: 'Z1',
          LocationCoordinates: { latitude: 10, longitude: 10 },
          NumberOfPeople: 50,
          UrgencyLevel: 2,
        },
        {
          ZoneID: 'Z2', // More urgent
          LocationCoordinates: { latitude: 20, longitude: 20 },
          NumberOfPeople: 30,
          UrgencyLevel: 5,
        },
      ];

      const mockVehicles: Vehicle[] = [
        {
          VehicleID: 'V1',
          Capacity: 40,
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
      ];

      const mockStatuses: EvacuationStatus[] = [
        { ZoneID: 'Z1', TotalEvacuated: 0, RemainingPeople: 50 },
        { ZoneID: 'Z2', TotalEvacuated: 0, RemainingPeople: 30 },
      ];

      (DataRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (DataRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (DataRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (DataRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

      (GeoService.haversineDistance as jest.Mock).mockReturnValue(10);
      (GeoService.calculateETA as jest.Mock).mockReturnValue('10 minutes');

      const plan = await EvacuationService.generatePlan();

      expect(plan).toHaveLength(1);
      expect(plan[0].ZoneID).toBe('Z2'); // Should prioritize Z2
      expect(plan[0].VehicleID).toBe('V1');
      expect(plan[0].NumberOfPeople).toBe(30); // 30 needed, 40 capacity
      expect(plan[0].ETA).toBe('10 minutes');

      expect(DataRepository.savePlan).toHaveBeenCalledWith(plan);
    });

    it('should allocate multiple vehicles if needed for a single zone', async () => {
      const mockZones: EvacuationZone[] = [
        {
          ZoneID: 'Z1',
          LocationCoordinates: { latitude: 10, longitude: 10 },
          NumberOfPeople: 100,
          UrgencyLevel: 5,
        },
      ];

      const mockVehicles: Vehicle[] = [
        {
          VehicleID: 'V1',
          Capacity: 40,
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
        {
          VehicleID: 'V2',
          Capacity: 40,
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
        {
          VehicleID: 'V3',
          Capacity: 40,
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
      ];

      const mockStatuses: EvacuationStatus[] = [
        { ZoneID: 'Z1', TotalEvacuated: 0, RemainingPeople: 100 },
      ];

      (DataRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (DataRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (DataRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (DataRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

      (GeoService.haversineDistance as jest.Mock).mockReturnValue(10);
      (GeoService.calculateETA as jest.Mock).mockReturnValue('10 minutes');

      const plan = await EvacuationService.generatePlan();

      expect(plan).toHaveLength(3);
      // First vehicle takes 40
      expect(plan[0].NumberOfPeople).toBe(40);
      // Second vehicle takes 40
      expect(plan[1].NumberOfPeople).toBe(40);
      // Third vehicle takes remaining 20
      expect(plan[2].NumberOfPeople).toBe(20);
    });

    it('should return empty plan if no vehicles available', async () => {
      const mockZones: EvacuationZone[] = [
        {
          ZoneID: 'Z1',
          LocationCoordinates: { latitude: 10, longitude: 10 },
          NumberOfPeople: 50,
          UrgencyLevel: 5,
        },
      ];

      const mockVehicles: Vehicle[] = [];

      const mockStatuses: EvacuationStatus[] = [
        { ZoneID: 'Z1', TotalEvacuated: 0, RemainingPeople: 50 },
      ];

      (DataRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (DataRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (DataRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (DataRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

      const plan = await EvacuationService.generatePlan();

      expect(plan).toHaveLength(0);
    });

    it('should not assign vehicles to a zone with 0 remaining people', async () => {
        const mockZones: EvacuationZone[] = [
          {
            ZoneID: 'Z1',
            LocationCoordinates: { latitude: 10, longitude: 10 },
            NumberOfPeople: 50,
            UrgencyLevel: 5,
          },
        ];
  
        const mockVehicles: Vehicle[] = [
          {
            VehicleID: 'V1',
            Capacity: 40,
            Type: 'bus',
            LocationCoordinates: { latitude: 15, longitude: 15 },
            Speed: 60,
          },
        ];
  
        const mockStatuses: EvacuationStatus[] = [
          { ZoneID: 'Z1', TotalEvacuated: 50, RemainingPeople: 0 }, // Fully evacuated
        ];
  
        (DataRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
        (DataRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
        (DataRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
        (DataRepository.savePlan as jest.Mock).mockResolvedValue(undefined);
  
        const plan = await EvacuationService.generatePlan();
  
        expect(plan).toHaveLength(0);
      });
  });
});
