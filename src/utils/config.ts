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
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
export const redis = new Redis({
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6380,
  password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
  tls: redisUrl.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err) => {
  logger.error(err, 'Redis Client Error');
});

redis.on('connect', () => {
  logger.info('Connected to Redis successfully');
});
