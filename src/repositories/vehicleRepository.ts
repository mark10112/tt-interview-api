import { prisma } from '../utils/prisma';
import { Vehicle } from '../models';

const toVehicle = (row: { VehicleID: string; Capacity: number; Type: string; Latitude: number; Longitude: number; Speed: number }): Vehicle => ({
  VehicleID: row.VehicleID,
  Capacity: row.Capacity,
  Type: row.Type,
  LocationCoordinates: { latitude: row.Latitude, longitude: row.Longitude },
  Speed: row.Speed,
});

export class VehicleRepository {
  static async addVehicle(vehicle: Vehicle): Promise<void> {
    await prisma.vehicle.create({
      data: {
        VehicleID: vehicle.VehicleID,
        Capacity: vehicle.Capacity,
        Type: vehicle.Type,
        Latitude: vehicle.LocationCoordinates.latitude,
        Longitude: vehicle.LocationCoordinates.longitude,
        Speed: vehicle.Speed,
      },
    });
  }

  static async getVehicles(): Promise<Vehicle[]> {
    const rows = await prisma.vehicle.findMany();
    return rows.map(toVehicle);
  }

  static async clearVehicles(): Promise<void> {
    await prisma.vehicle.deleteMany();
  }
}
