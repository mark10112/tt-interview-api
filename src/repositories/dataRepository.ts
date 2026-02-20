import { redis } from '../utils/config';
import { EvacuationZone, Vehicle, EvacuationAssignment, EvacuationStatus } from '../models';

const ZONES_KEY = 'evacuation:zones';
const VEHICLES_KEY = 'evacuation:vehicles';
const STATUS_KEY = 'evacuation:status';
const PLANS_KEY = 'evacuation:plans';

export class DataRepository {
  // Zones
  static async addZone(zone: EvacuationZone): Promise<void> {
    await redis.hset(ZONES_KEY, zone.ZoneID, JSON.stringify(zone));
    // Initialize status for the new zone
    const status: EvacuationStatus = {
      ZoneID: zone.ZoneID,
      TotalEvacuated: 0,
      RemainingPeople: zone.NumberOfPeople,
    };
    await redis.hset(STATUS_KEY, zone.ZoneID, JSON.stringify(status));
  }

  static async getZones(): Promise<EvacuationZone[]> {
    const data = await redis.hgetall(ZONES_KEY);
    return Object.values(data).map(item => JSON.parse(item));
  }

  static async getZone(zoneId: string): Promise<EvacuationZone | null> {
    const data = await redis.hget(ZONES_KEY, zoneId);
    return data ? JSON.parse(data) : null;
  }

  // Vehicles
  static async addVehicle(vehicle: Vehicle): Promise<void> {
    await redis.hset(VEHICLES_KEY, vehicle.VehicleID, JSON.stringify(vehicle));
  }

  static async getVehicles(): Promise<Vehicle[]> {
    const data = await redis.hgetall(VEHICLES_KEY);
    return Object.values(data).map(item => JSON.parse(item));
  }

  // Plans (Assignments)
  static async savePlan(assignments: EvacuationAssignment[]): Promise<void> {
    await redis.set(PLANS_KEY, JSON.stringify(assignments));
  }

  static async getPlan(): Promise<EvacuationAssignment[] | null> {
    const data = await redis.get(PLANS_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Status
  static async getStatuses(): Promise<EvacuationStatus[]> {
    const data = await redis.hgetall(STATUS_KEY);
    return Object.values(data).map(item => JSON.parse(item));
  }

  static async getStatus(zoneId: string): Promise<EvacuationStatus | null> {
    const data = await redis.hget(STATUS_KEY, zoneId);
    return data ? JSON.parse(data) : null;
  }

  static async updateStatus(status: EvacuationStatus): Promise<void> {
    await redis.hset(STATUS_KEY, status.ZoneID, JSON.stringify(status));
  }

  // Clear All
  static async clearAll(): Promise<void> {
    await redis.del(ZONES_KEY, VEHICLES_KEY, STATUS_KEY, PLANS_KEY);
  }
}
