import { Request, Response, NextFunction } from 'express';
import { EvacuationService } from '../services';
import { UpdateEvacuationSchema } from '../models';
import { logger } from '../utils/config';
import { HttpError } from '../utils/errors';
import { HTTP_STATUS } from '../utils/constants';

export class EvacuationController {
  // POST /api/evacuations/plan
  static async generatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await EvacuationService.generatePlan();
      logger.info({ assignmentsCount: plan.length }, 'Generated new evacuation plan');
      res.status(HTTP_STATUS.OK).json(plan);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/evacuations/status
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statuses = await EvacuationService.getStatuses();
      res.status(HTTP_STATUS.OK).json(statuses);
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/evacuations/update
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = UpdateEvacuationSchema.parse(req.body);
      const status = await EvacuationService.updateStatus(parsedData);
      logger.info({ zoneId: parsedData.ZoneID, vehicleId: parsedData.VehicleID, requestedEvacuees: parsedData.EvacueesMoved }, 'Updated evacuation status');
      res.status(HTTP_STATUS.OK).json(status);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  // DELETE /api/evacuations/clear
  static async clearAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await EvacuationService.clearAll();
      logger.info('Cleared all evacuation data');
      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }
}
