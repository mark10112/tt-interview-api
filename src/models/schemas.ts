import { z } from 'zod';

export const LocationCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export type LocationCoordinates = z.infer<typeof LocationCoordinatesSchema>;

export const EvacuationZoneSchema = z.object({
  ZoneID: z.string(),
  LocationCoordinates: LocationCoordinatesSchema,
  NumberOfPeople: z.number().int().positive(),
  UrgencyLevel: z.number().int().min(1).max(5),
});

export type EvacuationZone = z.infer<typeof EvacuationZoneSchema>;

export const VehicleSchema = z.object({
  VehicleID: z.string(),
  Capacity: z.number().int().positive(),
  Type: z.string(),
  LocationCoordinates: LocationCoordinatesSchema,
  Speed: z.number().positive(),
});

export type Vehicle = z.infer<typeof VehicleSchema>;

export const EvacuationAssignmentSchema = z.object({
  ZoneID: z.string(),
  VehicleID: z.string(),
  ETA: z.string(),
  NumberOfPeople: z.number().int().positive(),
});

export type EvacuationAssignment = z.infer<typeof EvacuationAssignmentSchema>;

export const EvacuationStatusSchema = z.object({
  ZoneID: z.string(),
  TotalEvacuated: z.number().int().nonnegative(),
  RemainingPeople: z.number().int().nonnegative(),
});

export type EvacuationStatus = z.infer<typeof EvacuationStatusSchema>;

export const UpdateEvacuationSchema = z.object({
  ZoneID: z.string(),
  VehicleID: z.string(),
  EvacueesMoved: z.number().int().positive(),
});

export type UpdateEvacuation = z.infer<typeof UpdateEvacuationSchema>;
