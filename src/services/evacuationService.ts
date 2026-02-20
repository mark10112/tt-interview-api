import { ZoneRepository, VehicleRepository, PlanRepository, StatusRepository } from '../repositories';
import { GeoService } from '.';
import { EvacuationZone, Vehicle, EvacuationAssignment, EvacuationStatus, UpdateEvacuation } from '../models';
import { HttpError } from '../utils/errors';
import { VEHICLE_SCORE_PENALTY, ERROR_MESSAGES, HTTP_STATUS } from '../utils/constants';

function scoreVehicle(vehicle: Vehicle, zone: EvacuationZone, needed: number): { score: number; distKm: number } {
  const distKm = GeoService.haversineDistance(vehicle.LocationCoordinates, zone.LocationCoordinates);
  const capacityPenalty =
    vehicle.Capacity < needed
      ? VEHICLE_SCORE_PENALTY.UNDER_CAPACITY
      : vehicle.Capacity > needed * VEHICLE_SCORE_PENALTY.OVER_CAPACITY_MULTIPLIER
        ? VEHICLE_SCORE_PENALTY.OVER_CAPACITY
        : 0;
  return { score: distKm + capacityPenalty, distKm };
}

function pickBestVehicle(vehicles: Vehicle[], zone: EvacuationZone, needed: number) {
  return vehicles.reduce<{ index: number; distKm: number; score: number }>(
    (best, vehicle, i) => {
      const { score, distKm } = scoreVehicle(vehicle, zone, needed);
      return score < best.score ? { index: i, distKm, score } : best;
    },
    { index: -1, distKm: 0, score: Infinity },
  );
}

function assignVehiclesToZone(
  zone: EvacuationZone,
  needed: number,
  availableVehicles: Vehicle[],
): EvacuationAssignment[] {
  const results: EvacuationAssignment[] = [];
  let remaining = needed;

  while (remaining > 0 && availableVehicles.length > 0) {
    const { index, distKm } = pickBestVehicle(availableVehicles, zone, remaining);
    if (index === -1) break;

    const [vehicle] = availableVehicles.splice(index, 1);
    const evacuating = Math.min(vehicle.Capacity, remaining);
    remaining -= evacuating;

    results.push({
      ZoneID: zone.ZoneID,
      VehicleID: vehicle.VehicleID,
      ETA: GeoService.calculateETA(distKm, vehicle.Speed),
      NumberOfPeople: evacuating,
    });
  }

  return results;
}

export class EvacuationService {
  static async generatePlan(): Promise<EvacuationAssignment[]> {
    const [zones, vehicles, statuses] = await Promise.all([
      ZoneRepository.getZones(),
      VehicleRepository.getVehicles(),
      StatusRepository.getStatuses(),
    ]);

    const remaining = Object.fromEntries<number>(
      statuses.map((s: EvacuationStatus) => [s.ZoneID, s.RemainingPeople]),
    );

    const sortedZones = [...zones].sort((a, b) => b.UrgencyLevel - a.UrgencyLevel);
    const availableVehicles = [...vehicles];
    const assignments: EvacuationAssignment[] = [];

    for (const zone of sortedZones) {
      const needed = remaining[zone.ZoneID] ?? 0;
      assignments.push(...assignVehiclesToZone(zone, needed, availableVehicles));
    }

    await PlanRepository.savePlan(assignments);
    return assignments;
  }

  static async getStatuses(): Promise<EvacuationStatus[]> {
    return StatusRepository.getStatuses();
  }

  static async updateStatus(input: UpdateEvacuation): Promise<EvacuationStatus> {
    const [status, zone] = await Promise.all([
      StatusRepository.getStatus(input.ZoneID),
      ZoneRepository.getZone(input.ZoneID),
    ]);

    if (!status || !zone) {
      throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ZONE_STATUS_NOT_FOUND);
    }

    const newTotalEvacuated = Math.min(status.TotalEvacuated + input.EvacueesMoved, zone.NumberOfPeople);
    status.TotalEvacuated = newTotalEvacuated;
    status.RemainingPeople = zone.NumberOfPeople - newTotalEvacuated;

    await StatusRepository.updateStatus(status);
    return status;
  }

  static async clearAll(): Promise<void> {
    await Promise.all([
      ZoneRepository.clearZones(),
      VehicleRepository.clearVehicles(),
      StatusRepository.clearStatuses(),
    ]);
  }
}
