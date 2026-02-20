import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ZoneController, VehicleController, EvacuationController } from './controllers';

export const routes = Router();

// Zod Validation Errors Middleware
const handleZodError = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation Error', details: err.issues });
  }
  next(err);
};

// Endpoints
routes.post('/api/evacuation-zones', ZoneController.addZone);
routes.post('/api/vehicles', VehicleController.addVehicle);
routes.post('/api/evacuations/plan', EvacuationController.generatePlan);
routes.get('/api/evacuations/status', EvacuationController.getStatus);
routes.put('/api/evacuations/update', EvacuationController.updateStatus);
routes.delete('/api/evacuations/clear', EvacuationController.clearAll);

// Use validation error handler
routes.use(handleZodError);
