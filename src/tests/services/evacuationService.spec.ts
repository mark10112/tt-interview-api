import { EvacuationService } from '../../services';
import { ZoneRepository, VehicleRepository, PlanRepository, StatusRepository } from '../../repositories';
import { GeoService } from '../../services';
import { EvacuationZone, Vehicle, EvacuationStatus } from '../../models';
import { redis } from '../../utils/config';

jest.mock('../../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() }
}));
jest.mock('../../repositories/zoneRepository');
jest.mock('../../repositories/vehicleRepository');
jest.mock('../../repositories/planRepository');
jest.mock('../../repositories/statusRepository');
jest.mock('../../services/geoService');

describe('EvacuationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Disconnect Redis to avoid jest process hanging
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

      (ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (VehicleRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (PlanRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

      (GeoService.haversineDistance as jest.Mock).mockReturnValue(10);
      (GeoService.calculateETA as jest.Mock).mockReturnValue('10 minutes');

      const plan = await EvacuationService.generatePlan();

      expect(plan).toHaveLength(1);
      expect(plan[0].ZoneID).toBe('Z2'); // Should prioritize Z2
      expect(plan[0].VehicleID).toBe('V1');
      expect(plan[0].NumberOfPeople).toBe(30); // 30 needed, 40 capacity
      expect(plan[0].ETA).toBe('10 minutes');

      expect(PlanRepository.savePlan).toHaveBeenCalledWith(plan);
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

      (ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (VehicleRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (PlanRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

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

      (ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (VehicleRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (PlanRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

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
  
        (ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
        (VehicleRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
        (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
        (PlanRepository.savePlan as jest.Mock).mockResolvedValue(undefined);
  
        const plan = await EvacuationService.generatePlan();
  
        expect(plan).toHaveLength(0);
      });

    it('should apply over-capacity penalty when vehicle capacity is more than 2x needed', async () => {
      const mockZones: EvacuationZone[] = [
        {
          ZoneID: 'Z1',
          LocationCoordinates: { latitude: 10, longitude: 10 },
          NumberOfPeople: 10,
          UrgencyLevel: 5,
        },
      ];

      const mockVehicles: Vehicle[] = [
        {
          VehicleID: 'V1',
          Capacity: 5, // under capacity (5 < 10)
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
        {
          VehicleID: 'V2',
          Capacity: 100, // over capacity (100 > 10 * 2 = 20), gets over-capacity penalty
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
        {
          VehicleID: 'V3',
          Capacity: 10, // exact capacity, no penalty
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
      ];

      const mockStatuses: EvacuationStatus[] = [
        { ZoneID: 'Z1', TotalEvacuated: 0, RemainingPeople: 10 },
      ];

      (ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (VehicleRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (PlanRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

      // Return different distances so V3 (exact capacity) wins over V2 (over-capacity penalty)
      (GeoService.haversineDistance as jest.Mock).mockReturnValue(10);
      (GeoService.calculateETA as jest.Mock).mockReturnValue('10 minutes');

      const plan = await EvacuationService.generatePlan();

      // V3 has no penalty and same distance, so it should be picked first
      expect(plan[0].VehicleID).toBe('V3');
      expect(plan[0].NumberOfPeople).toBe(10);
    });

    it('should pick the vehicle with lower score when comparing two vehicles', async () => {
      const mockZones: EvacuationZone[] = [
        {
          ZoneID: 'Z1',
          LocationCoordinates: { latitude: 10, longitude: 10 },
          NumberOfPeople: 30,
          UrgencyLevel: 5,
        },
      ];

      const mockVehicles: Vehicle[] = [
        {
          VehicleID: 'V1',
          Capacity: 30,
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
        {
          VehicleID: 'V2',
          Capacity: 30,
          Type: 'bus',
          LocationCoordinates: { latitude: 20, longitude: 20 },
          Speed: 60,
        },
      ];

      const mockStatuses: EvacuationStatus[] = [
        { ZoneID: 'Z1', TotalEvacuated: 0, RemainingPeople: 30 },
      ];

      (ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (VehicleRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (PlanRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

      // V1 is closer (score 5), V2 is farther (score 20) — V1 should win
      (GeoService.haversineDistance as jest.Mock)
        .mockReturnValueOnce(5)   // V1 distance
        .mockReturnValueOnce(20); // V2 distance
      (GeoService.calculateETA as jest.Mock).mockReturnValue('5 minutes');

      const plan = await EvacuationService.generatePlan();

      expect(plan).toHaveLength(1);
      expect(plan[0].VehicleID).toBe('V1');
    });

    it('should use zone.NumberOfPeople when no status exists for a zone', async () => {
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
          Capacity: 50,
          Type: 'bus',
          LocationCoordinates: { latitude: 15, longitude: 15 },
          Speed: 60,
        },
      ];

      // No status for Z1 — should fall back to zone.NumberOfPeople
      const mockStatuses: EvacuationStatus[] = [];

      (ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
      (VehicleRepository.getVehicles as jest.Mock).mockResolvedValue(mockVehicles);
      (StatusRepository.getStatuses as jest.Mock).mockResolvedValue(mockStatuses);
      (PlanRepository.savePlan as jest.Mock).mockResolvedValue(undefined);

      (GeoService.haversineDistance as jest.Mock).mockReturnValue(10);
      (GeoService.calculateETA as jest.Mock).mockReturnValue('10 minutes');

      const plan = await EvacuationService.generatePlan();

      expect(plan).toHaveLength(1);
      expect(plan[0].NumberOfPeople).toBe(50);
    });
  });
});
