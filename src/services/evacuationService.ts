import { DataRepository } from '../repositories/dataRepository';
import { GeoService } from './geoService';
import { EvacuationZone, Vehicle, EvacuationAssignment, EvacuationStatus } from '../models';

export class EvacuationService {
  /**
   * Generates a plan that assigns vehicles to evacuation zones based on urgency, distance, and capacity.
   * Modifies state to allocate the vehicles.
   */
  static async generatePlan(): Promise<EvacuationAssignment[]> {
    const zones: EvacuationZone[] = await DataRepository.getZones();
    let vehicles: Vehicle[] = await DataRepository.getVehicles();
    const statuses: EvacuationStatus[] = await DataRepository.getStatuses();

    // Prioritize zones with higher urgency
    const sortedZones = zones.sort((a, b) => b.UrgencyLevel - a.UrgencyLevel);

    const assignments: EvacuationAssignment[] = [];

    // Simple tracking of remaining people for planning purposes
    const remainingPeoplePerZone: { [key: string]: number } = {};
    for (const status of statuses) {
      remainingPeoplePerZone[status.ZoneID] = status.RemainingPeople;
    }

    for (const zone of sortedZones) {
      let neededCapacity = remainingPeoplePerZone[zone.ZoneID];

      // Stop trying to allocate if zone is cleared
      if (neededCapacity <= 0) continue;

      // Find best available vehicles
      // Iterate until the zone's needs are met or we run out of vehicles
      while (neededCapacity > 0 && vehicles.length > 0) {
        // Find closest vehicle with suitable capacity
        // We'll calculate a simple score:
        // Score = (Distance * weight) - (Capacity match * weight)
        // Lower score is better.

        let bestVehicleIndex = -1;
        let bestScore = Infinity;
        let bestDistance = 0;

        for (let i = 0; i < vehicles.length; i++) {
          const v = vehicles[i];
          const distKm = GeoService.haversineDistance(v.LocationCoordinates, zone.LocationCoordinates);
          
          // To optimize capacity:
          // If capacity >= neededCapacity, it's a perfect match (0 penalty).
          // If capacity < neededCapacity, it requires another trip, so slight penalty.
          let capacityPenalty = 0;
          if (v.Capacity < neededCapacity) {
            capacityPenalty = 10; // Simple penalty
          } else if (v.Capacity > neededCapacity * 2) {
            // Very oversized vehicle
            capacityPenalty = 5;
          }

          // Combined score (distance is heavily weighted)
          const score = distKm + capacityPenalty;

          if (score < bestScore) {
            bestScore = score;
            bestVehicleIndex = i;
            bestDistance = distKm;
          }
        }

        if (bestVehicleIndex !== -1) {
          const selectedVehicle = vehicles[bestVehicleIndex];
          
          // Allocate vehicle
          const evacuatingPeople = Math.min(selectedVehicle.Capacity, neededCapacity);
          neededCapacity -= evacuatingPeople;
          
          // Calculate ETA
          const eta = GeoService.calculateETA(bestDistance, selectedVehicle.Speed);

          assignments.push({
            ZoneID: zone.ZoneID,
            VehicleID: selectedVehicle.VehicleID,
            ETA: eta,
            NumberOfPeople: evacuatingPeople,
          });

          // Remove the selected vehicle from the available list for this planning run
          // In a real-world scenario, the vehicle would become available again after a certain time.
          vehicles.splice(bestVehicleIndex, 1);
        } else {
          // Should not reach here if vehicles.length > 0 and no edge case hit
          break;
        }
      }
      
      // Update our temporary tracker so subsequent logic knows what's left
      remainingPeoplePerZone[zone.ZoneID] = neededCapacity;
    }

    // Save the plan
    await DataRepository.savePlan(assignments);

    return assignments;
  }
}
