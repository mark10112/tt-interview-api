import { Request, Response, NextFunction } from 'express';
import { DataRepository } from '../repositories/dataRepository';
import { EvacuationService } from '../services/evacuationService';
import { 
  EvacuationZoneSchema, 
  VehicleSchema, 
  UpdateEvacuationSchema 
} from '../models/schemas';
import { logger } from '../utils/config';

export class EvacuationController {
  
  // POST /api/evacuation-zones
  static async addZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = EvacuationZoneSchema.parse(req.body);
      
      const existingZone = await DataRepository.getZone(parsedData.ZoneID);
      if (existingZone) {
        res.status(409).json({ error: 'Zone already exists' });
        return;
      }

      await DataRepository.addZone(parsedData);
      logger.info({ zoneId: parsedData.ZoneID }, 'Added new evacuation zone');
      res.status(201).json(parsedData);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/vehicles
  static async addVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = VehicleSchema.parse(req.body);
      await DataRepository.addVehicle(parsedData);
      logger.info({ vehicleId: parsedData.VehicleID }, 'Added new vehicle');
      res.status(201).json(parsedData);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/evacuations/plan
  static async generatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await EvacuationService.generatePlan();
      logger.info({ assignmentsCount: plan.length }, 'Generated new evacuation plan');
      res.status(200).json(plan);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/evacuations/status
  static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statuses = await DataRepository.getStatuses();
      res.status(200).json(statuses);
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/evacuations/update
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedData = UpdateEvacuationSchema.parse(req.body);
      
      const status = await DataRepository.getStatus(parsedData.ZoneID);
      const zone = await DataRepository.getZone(parsedData.ZoneID);
      
      if (!status || !zone) {
        res.status(404).json({ error: 'Zone status not found' });
        return;
      }

      // Ensure we don't evacuate more people than the zone originally had
      const newTotalEvacuated = Math.min(status.TotalEvacuated + parsedData.EvacueesMoved, zone.NumberOfPeople);
      const newRemainingPeople = zone.NumberOfPeople - newTotalEvacuated;

      status.TotalEvacuated = newTotalEvacuated;
      status.RemainingPeople = newRemainingPeople;

      await DataRepository.updateStatus(status);
      logger.info({ zoneId: parsedData.ZoneID, vehicleId: parsedData.VehicleID, requestedEvacuees: parsedData.EvacueesMoved }, 'Updated evacuation status');
      
      res.status(200).json(status);
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/evacuations/clear
  static async clearAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await DataRepository.clearAll();
      logger.info('Cleared all evacuation data');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
