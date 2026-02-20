import { GeoService } from '../services';
import { LocationCoordinates } from '../models';

describe('GeoService', () => {
  describe('haversineDistance', () => {
    it('should calculate the distance between two same points as 0', () => {
      const coord1: LocationCoordinates = { latitude: 13.7563, longitude: 100.5018 };
      const coord2: LocationCoordinates = { latitude: 13.7563, longitude: 100.5018 };

      const distance = GeoService.haversineDistance(coord1, coord2);

      expect(distance).toBe(0);
    });

    it('should calculate the correct distance between two different points', () => {
      // Bangkok
      const coord1: LocationCoordinates = { latitude: 13.7563, longitude: 100.5018 };
      // Chiang Mai
      const coord2: LocationCoordinates = { latitude: 18.7883, longitude: 98.9853 };

      const distance = GeoService.haversineDistance(coord1, coord2);

      // Distance should be approximately 580km
      expect(distance).toBeGreaterThan(570);
      expect(distance).toBeLessThan(590);
    });
  });

  describe('calculateETA', () => {
    it('should return "Unknown" if speed is 0 or less', () => {
      expect(GeoService.calculateETA(100, 0)).toBe('Unknown');
      expect(GeoService.calculateETA(100, -10)).toBe('Unknown');
    });

    it('should format minutes correctly for less than 60 minutes', () => {
      expect(GeoService.calculateETA(30, 60)).toBe('30 minutes');
      expect(GeoService.calculateETA(1, 60)).toBe('1 minute');
    });

    it('should format hours correctly for exactly round hours', () => {
      expect(GeoService.calculateETA(60, 60)).toBe('1 hour');
      expect(GeoService.calculateETA(120, 60)).toBe('2 hours');
    });

    it('should format hours and minutes correctly', () => {
      expect(GeoService.calculateETA(90, 60)).toBe('1 hour 30 minutes');
      expect(GeoService.calculateETA(121, 60)).toBe('2 hours 1 minute');
    });
  });
});
