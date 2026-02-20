import { z } from 'zod';

export const LocationCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export type LocationCoordinates = z.infer<typeof LocationCoordinatesSchema>;
