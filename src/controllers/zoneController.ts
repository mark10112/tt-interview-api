import { Request, Response, NextFunction } from 'express';
import { ZoneService } from '../services';
import { EvacuationZoneSchema } from '../models';
import { logger } from '../utils/config';
import { HttpError } from '../utils/errors';
import { HTTP_STATUS } from '../utils/constants';

export class ZoneController {
  // POST /api/evacuation-zones
  static async addZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = EvacuationZoneSchema.parse(req.body);
      await ZoneService.addZone(parsedData);
      logger.info({ zoneId: parsedData.ZoneID }, 'Added new evacuation zone');
      res.status(HTTP_STATUS.CREATED).json(parsedData);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      next(err);
    }
  }
}
