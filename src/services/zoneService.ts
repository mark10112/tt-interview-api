import { ZoneRepository } from '../repositories/zoneRepository';
import { EvacuationZone } from '../models';
import { HttpError } from '../utils/errors';
import { ERROR_MESSAGES, HTTP_STATUS } from '../utils/constants';

export class ZoneService {
  static async addZone(zone: EvacuationZone): Promise<void> {
    const existing = await ZoneRepository.getZone(zone.ZoneID);
    if (existing) {
      throw new HttpError(HTTP_STATUS.CONFLICT, ERROR_MESSAGES.ZONE_ALREADY_EXISTS);
    }
    await ZoneRepository.addZone(zone);
  }
}
