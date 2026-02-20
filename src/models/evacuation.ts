import { z } from 'zod';

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
