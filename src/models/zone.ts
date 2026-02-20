import { z } from 'zod';
import { LocationCoordinatesSchema } from './location';

export const EvacuationZoneSchema = z.object({
  ZoneID: z.string(),
  LocationCoordinates: LocationCoordinatesSchema,
  NumberOfPeople: z.number().int().positive(),
  UrgencyLevel: z.number().int().min(1).max(5),
});

export type EvacuationZone = z.infer<typeof EvacuationZoneSchema>;
