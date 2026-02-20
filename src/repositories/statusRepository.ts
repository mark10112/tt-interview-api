import { redis } from '../utils/config';
import { EvacuationStatus } from '../models';
import { REDIS_KEYS } from '../utils/constants';

const STATUS_KEY = REDIS_KEYS.EVACUATION_STATUS;

export class StatusRepository {
  static async getStatuses(): Promise<EvacuationStatus[]> {
    const data = await redis.hgetall(STATUS_KEY);
    return Object.values(data).map(item => JSON.parse(item));
  }

  static async getStatus(zoneId: string): Promise<EvacuationStatus | null> {
    const data = await redis.hget(STATUS_KEY, zoneId);
    return data ? JSON.parse(data) : null;
  }

  static async updateStatus(status: EvacuationStatus): Promise<void> {
    await redis.hset(STATUS_KEY, status.ZoneID, JSON.stringify(status));
  }

  static async clearStatuses(): Promise<void> {
    await redis.del(STATUS_KEY);
  }
}
