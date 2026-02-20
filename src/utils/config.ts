import Redis from 'ioredis';
import pino from 'pino';

// Initialize Logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Initialize Redis Client
export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err) => {
  logger.error(err, 'Redis Client Error');
});

redis.on('connect', () => {
  logger.info('Connected to Redis successfully');
});
