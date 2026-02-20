import { LocationCoordinates } from '../models';

export class GeoService {
  /**
   * Calculates the great-circle distance between two points on the Earth's surface
   * using the Haversine formula.
   *
   * @param coord1 First coordinate pair (latitude/longitude)
   * @param coord2 Second coordinate pair (latitude/longitude)
   * @returns Distance in kilometers
   */
  static haversineDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
    const R = 6371; // Radius of the Earth in km

    const dLat = this.degreesToRadians(coord2.latitude - coord1.latitude);
    const dLon = this.degreesToRadians(coord2.longitude - coord1.longitude);

    const lat1 = this.degreesToRadians(coord1.latitude);
    const lat2 = this.degreesToRadians(coord2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in km
  }

  private static degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculates estimated time of arrival (ETA).
   *
   * @param distanceKm Distance in kilometers
   * @param speedKmh Speed in kilometers per hour
   * @returns Formatted ETA string (e.g., "15 minutes", "1 hour 30 minutes")
   */
  static calculateETA(distanceKm: number, speedKmh: number): string {
    if (speedKmh <= 0) return 'Unknown';

    const hours = distanceKm / speedKmh;
    const totalMinutes = Math.round(hours * 60);

    if (totalMinutes < 60) {
      return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
    }

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (m === 0) {
      return `${h} hour${h !== 1 ? 's' : ''}`;
    }

    return `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}`;
  }
}
