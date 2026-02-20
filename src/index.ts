import express from 'express';
import cors from 'cors';
import { routes } from './routes';
import { ErrorHandler } from './middlewares/errorHandler';
import { logger } from './utils/config';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/', routes);

// Global Error Handler
app.use(ErrorHandler.handle);

// Start Server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
