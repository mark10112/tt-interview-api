import { PlanRepository } from '../repositories/planRepository';
import { EvacuationAssignment } from '../models';
import { prisma } from '../utils/prisma';

jest.mock('../utils/prisma', () => ({
  prisma: {
    plan: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));

const mockAssignments: EvacuationAssignment[] = [
  { ZoneID: 'Z1', VehicleID: 'V1', ETA: '10 minutes', NumberOfPeople: 40 },
  { ZoneID: 'Z1', VehicleID: 'V2', ETA: '15 minutes', NumberOfPeople: 30 },
];

const mockPrismaRows = [
  { id: 1, ZoneID: 'Z1', VehicleID: 'V1', ETA: '10 minutes', NumberOfPeople: 40 },
  { id: 2, ZoneID: 'Z1', VehicleID: 'V2', ETA: '15 minutes', NumberOfPeople: 30 },
];

describe('PlanRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('savePlan', () => {
    it('should execute deleteMany and createMany in a transaction', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([{ count: 0 }, { count: 2 }]);

      await PlanRepository.savePlan(mockAssignments);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionArgs = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      expect(transactionArgs).toHaveLength(2);
    });

    it('should pass correct data shape to createMany', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (ops: unknown[]) => {
        return Promise.all(ops.map(() => Promise.resolve()));
      });
      (prisma.plan.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.plan.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      await PlanRepository.savePlan(mockAssignments);

      expect(prisma.plan.createMany).toHaveBeenCalledWith({
        data: [
          { ZoneID: 'Z1', VehicleID: 'V1', ETA: '10 minutes', NumberOfPeople: 40 },
          { ZoneID: 'Z1', VehicleID: 'V2', ETA: '15 minutes', NumberOfPeople: 30 },
        ],
      });
    });

    it('should save an empty plan (clear all assignments)', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (ops: unknown[]) => {
        return Promise.all(ops.map(() => Promise.resolve()));
      });
      (prisma.plan.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.plan.createMany as jest.Mock).mockResolvedValue({ count: 0 });

      await PlanRepository.savePlan([]);

      expect(prisma.plan.createMany).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe('getPlan', () => {
    it('should return mapped EvacuationAssignment array when rows exist', async () => {
      (prisma.plan.findMany as jest.Mock).mockResolvedValue(mockPrismaRows);

      const result = await PlanRepository.getPlan();

      expect(result).toEqual([
        { ZoneID: 'Z1', VehicleID: 'V1', ETA: '10 minutes', NumberOfPeople: 40 },
        { ZoneID: 'Z1', VehicleID: 'V2', ETA: '15 minutes', NumberOfPeople: 30 },
      ]);
    });

    it('should return null when no plan rows exist', async () => {
      (prisma.plan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await PlanRepository.getPlan();

      expect(result).toBeNull();
    });

    it('should strip the auto-increment id field from results', async () => {
      (prisma.plan.findMany as jest.Mock).mockResolvedValue(mockPrismaRows);

      const result = await PlanRepository.getPlan();

      expect(result![0]).not.toHaveProperty('id');
    });
  });

  describe('clearPlans', () => {
    it('should call prisma.plan.deleteMany', async () => {
      (prisma.plan.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      await PlanRepository.clearPlans();

      expect(prisma.plan.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
