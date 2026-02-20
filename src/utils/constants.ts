export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const VEHICLE_SCORE_PENALTY = {
  UNDER_CAPACITY: 10,
  OVER_CAPACITY: 5,
  OVER_CAPACITY_MULTIPLIER: 2,
} as const;

export const DISTANCE_UNIT = 'km' as const;


export const REDIS_KEYS = {
  EVACUATION_STATUS: 'evacuation:status',
} as const;

export const ERROR_MESSAGES = {
  ZONE_ALREADY_EXISTS: 'Zone already exists',
  ZONE_STATUS_NOT_FOUND: 'Zone status not found',
} as const;

export const ETA = {
  UNKNOWN: 'Unknown',
  ZERO_MINUTES: '0 minutes',
} as const;

export const TIME_UNIT = {
  HOUR: 'hour',
  MINUTE: 'minute',
} as const;
