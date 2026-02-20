import { prisma } from '../utils/prisma';
import { EvacuationAssignment } from '../models';

export class PlanRepository {
  static async savePlan(assignments: EvacuationAssignment[]): Promise<void> {
    await prisma.$transaction([
      prisma.plan.deleteMany(),
      prisma.plan.createMany({
        data: assignments.map(a => ({
          ZoneID: a.ZoneID,
          VehicleID: a.VehicleID,
          ETA: a.ETA,
          NumberOfPeople: a.NumberOfPeople,
        })),
      }),
    ]);
  }

  static async getPlan(): Promise<EvacuationAssignment[] | null> {
    const rows = await prisma.plan.findMany();
    if (rows.length === 0) return null;
    return rows.map(row => ({
      ZoneID: row.ZoneID,
      VehicleID: row.VehicleID,
      ETA: row.ETA,
      NumberOfPeople: row.NumberOfPeople,
    }));
  }

  static async clearPlans(): Promise<void> {
    await prisma.plan.deleteMany();
  }
}
