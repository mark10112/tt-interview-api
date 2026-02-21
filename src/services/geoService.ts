import { getDistance, convertDistance } from 'geolib';
import { LocationCoordinates } from '../models';
import { ETA, DISTANCE_UNIT, TIME_UNIT } from '../utils/constants';

/**
 * Helper function to format numbers with plural units
 */
const plural = (n: number, unit: string) => `${n} ${unit}${n !== 1 ? 's' : ''}`;

/**
 * Service for geographic calculations
 */
export class GeoService {
  /**
   * Calculates the distance between two coordinates using the Haversine formula
   * @param coord1 First location coordinates
   * @param coord2 Second location coordinates
   * @returns Distance in kilometers
   */
  static haversineDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
    const meters = getDistance(
      { latitude: coord1.latitude, longitude: coord1.longitude },
      { latitude: coord2.latitude, longitude: coord2.longitude },
    );
    return convertDistance(meters, DISTANCE_UNIT);
  }

  /**
   * Calculates estimated time of arrival based on distance and speed
   * @param distanceKm Distance in kilometers
   * @param speedKmh Speed in kilometers per hour
   * @returns Formatted ETA string (e.g., "1 hour 30 minutes")
   */
  static calculateETA(distanceKm: number, speedKmh: number): string {
    if (speedKmh <= 0) return ETA.UNKNOWN;

    const totalMinutes = Math.round((distanceKm / speedKmh) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    return [h && plural(h, TIME_UNIT.HOUR), m && plural(m, TIME_UNIT.MINUTE)]
      .filter(Boolean)
      .join(' ') || ETA.ZERO_MINUTES;
  }
}
