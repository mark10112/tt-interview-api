import { Request, Response, NextFunction } from 'express';
import { VehicleRepository } from '../repositories/vehicleRepository';
import { VehicleSchema } from '../models';
import { logger } from '../utils/config';
import { HTTP_STATUS } from '../utils/constants';

export class VehicleController {
  // POST /api/vehicles
  static async addVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = VehicleSchema.parse(req.body);
      await VehicleRepository.addVehicle(parsedData);
      logger.info({ vehicleId: parsedData.VehicleID }, 'Added new vehicle');
      res.status(HTTP_STATUS.CREATED).json(parsedData);
    } catch (err) {
      next(err);
    }
  }
}
