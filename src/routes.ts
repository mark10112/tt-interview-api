import { Router } from 'express';
import { EvacuationController } from './controllers/evacuationController';

export const routes = Router();

// Zod Validation Errors Middleware
const handleZodError = (err: any, req: any, res: any, next: any) => {
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation Error', details: err.errors });
  }
  next(err);
};

// Endpoints
routes.post('/api/evacuation-zones', EvacuationController.addZone);
routes.post('/api/vehicles', EvacuationController.addVehicle);
routes.post('/api/evacuations/plan', EvacuationController.generatePlan);
routes.get('/api/evacuations/status', EvacuationController.getStatus);
routes.put('/api/evacuations/update', EvacuationController.updateStatus);
routes.delete('/api/evacuations/clear', EvacuationController.clearAll);

// Use validation error handler
routes.use(handleZodError);
