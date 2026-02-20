import { redis } from '../utils/config';
import { getDb } from '../utils/database';
import { EvacuationZone, Vehicle, EvacuationAssignment, EvacuationStatus } from '../models';

const STATUS_KEY = 'evacuation:status';

export class DataRepository {
  // Zones (SQLite)
  static async addZone(zone: EvacuationZone): Promise<void> {
    const db = await getDb();
    
    await db.run(
      'INSERT INTO zones (ZoneID, Latitude, Longitude, NumberOfPeople, UrgencyLevel) VALUES (?, ?, ?, ?, ?)',
      [zone.ZoneID, zone.LocationCoordinates.latitude, zone.LocationCoordinates.longitude, zone.NumberOfPeople, zone.UrgencyLevel]
    );

    // Initialize status for the new zone in Redis (Monitoring requirement)
    const status: EvacuationStatus = {
      ZoneID: zone.ZoneID,
      TotalEvacuated: 0,
      RemainingPeople: zone.NumberOfPeople,
    };
    await redis.hset(STATUS_KEY, zone.ZoneID, JSON.stringify(status));
  }

  static async getZones(): Promise<EvacuationZone[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM zones');
    
    return rows.map(row => ({
      ZoneID: row.ZoneID,
      LocationCoordinates: {
        latitude: row.Latitude,
        longitude: row.Longitude
      },
      NumberOfPeople: row.NumberOfPeople,
      UrgencyLevel: row.UrgencyLevel
    }));
  }

  static async getZone(zoneId: string): Promise<EvacuationZone | null> {
    const db = await getDb();
    const row = await db.get('SELECT * FROM zones WHERE ZoneID = ?', [zoneId]);
    
    if (!row) return null;

    return {
      ZoneID: row.ZoneID,
      LocationCoordinates: {
        latitude: row.Latitude,
        longitude: row.Longitude
      },
      NumberOfPeople: row.NumberOfPeople,
      UrgencyLevel: row.UrgencyLevel
    };
  }

  // Vehicles (SQLite)
  static async addVehicle(vehicle: Vehicle): Promise<void> {
    const db = await getDb();
    await db.run(
      'INSERT INTO vehicles (VehicleID, Capacity, Type, Latitude, Longitude, Speed) VALUES (?, ?, ?, ?, ?, ?)',
      [vehicle.VehicleID, vehicle.Capacity, vehicle.Type, vehicle.LocationCoordinates.latitude, vehicle.LocationCoordinates.longitude, vehicle.Speed]
    );
  }

  static async getVehicles(): Promise<Vehicle[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM vehicles');
    
    return rows.map(row => ({
      VehicleID: row.VehicleID,
      Capacity: row.Capacity,
      Type: row.Type,
      LocationCoordinates: {
        latitude: row.Latitude,
        longitude: row.Longitude
      },
      Speed: row.Speed
    }));
  }

  // Plans (Assignments) (SQLite)
  static async savePlan(assignments: EvacuationAssignment[]): Promise<void> {
    const db = await getDb();
    
    // Clear existing plans before saving a new one
    await db.run('DELETE FROM plans');

    for (const assignment of assignments) {
      await db.run(
        'INSERT INTO plans (ZoneID, VehicleID, ETA, NumberOfPeople) VALUES (?, ?, ?, ?)',
        [assignment.ZoneID, assignment.VehicleID, assignment.ETA, assignment.NumberOfPeople]
      );
    }
  }

  static async getPlan(): Promise<EvacuationAssignment[] | null> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM plans');
    
    if (rows.length === 0) return null;

    return rows.map(row => ({
      ZoneID: row.ZoneID,
      VehicleID: row.VehicleID,
      ETA: row.ETA,
      NumberOfPeople: row.NumberOfPeople
    }));
  }

  // Status (Redis - as per requirement for real-time monitoring)
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
    const db = await getDb();
    await db.run('DELETE FROM zones');
    await db.run('DELETE FROM vehicles');
    await db.run('DELETE FROM plans');
    
    await redis.del(STATUS_KEY);
  }
}
