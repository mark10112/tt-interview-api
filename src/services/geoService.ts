import { getDistance, convertDistance } from 'geolib';
import { LocationCoordinates } from '../models';
import { ETA, DISTANCE_UNIT, TIME_UNIT } from '../utils/constants';

const plural = (n: number, unit: string) => `${n} ${unit}${n !== 1 ? 's' : ''}`;

export class GeoService {
  static haversineDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
    const meters = getDistance(
      { latitude: coord1.latitude, longitude: coord1.longitude },
      { latitude: coord2.latitude, longitude: coord2.longitude },
    );
    return convertDistance(meters, DISTANCE_UNIT);
  }

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
