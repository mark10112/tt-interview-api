import { redis } from '../utils/config';
import { prisma } from '../utils/prisma';
import { EvacuationZone, EvacuationStatus } from '../models';
import { REDIS_KEYS } from '../utils/constants';

const STATUS_KEY = REDIS_KEYS.EVACUATION_STATUS;

const toEvacuationZone = (row: { ZoneID: string; Latitude: number; Longitude: number; NumberOfPeople: number; UrgencyLevel: number }): EvacuationZone => ({
  ZoneID: row.ZoneID,
  LocationCoordinates: { latitude: row.Latitude, longitude: row.Longitude },
  NumberOfPeople: row.NumberOfPeople,
  UrgencyLevel: row.UrgencyLevel,
});

export class ZoneRepository {
  static async addZone(zone: EvacuationZone): Promise<void> {
    await prisma.zone.create({
      data: {
        ZoneID: zone.ZoneID,
        Latitude: zone.LocationCoordinates.latitude,
        Longitude: zone.LocationCoordinates.longitude,
        NumberOfPeople: zone.NumberOfPeople,
        UrgencyLevel: zone.UrgencyLevel,
      },
    });

    // Initialize status for the new zone in Redis (Monitoring requirement)
    const status: EvacuationStatus = {
      ZoneID: zone.ZoneID,
      TotalEvacuated: 0,
      RemainingPeople: zone.NumberOfPeople,
    };
    await redis.hset(STATUS_KEY, zone.ZoneID, JSON.stringify(status));
  }

  static async getZones(): Promise<EvacuationZone[]> {
    const rows = await prisma.zone.findMany();
    return rows.map(toEvacuationZone);
  }

  static async getZone(zoneId: string): Promise<EvacuationZone | null> {
    const row = await prisma.zone.findUnique({ where: { ZoneID: zoneId } });
    return row ? toEvacuationZone(row) : null;
  }

  static async clearZones(): Promise<void> {
    await prisma.zone.deleteMany();
  }
}
