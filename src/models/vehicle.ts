import { z } from 'zod';
import { LocationCoordinatesSchema } from './location';

export const VehicleSchema = z.object({
  VehicleID: z.string(),
  Capacity: z.number().int().positive(),
  Type: z.string(),
  LocationCoordinates: LocationCoordinatesSchema,
  Speed: z.number().positive(),
});

export type Vehicle = z.infer<typeof VehicleSchema>;
