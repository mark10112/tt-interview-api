# Testing

---

## Overview

โปรเจกต์นี้ใช้ **Jest** + **ts-jest** สำหรับ unit testing

**ไฟล์ config:** `jest.config.js`

```javascript
const { createDefaultPreset } = require("ts-jest");
const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/tests/"   // ไม่รัน tests/ ที่ root (ถ้ามี)
  ],
  transform: {
    ...tsJestTransformCfg,
  },
};
```

**Run Tests:**
```bash
npm test
# หรือ
npx jest
# หรือ watch mode
npx jest --watch
```

---

## Test Files

| ไฟล์ | Test Suite | จำนวน Test |
|---|---|---|
| `src/tests/evacuationService.spec.ts` | `EvacuationService` | 4 tests |
| `src/tests/geoService.spec.ts` | `GeoService` | 6 tests |
| `src/tests/errorHandler.spec.ts` | `ErrorHandler Middleware` | 4 tests |
| `src/tests/zoneService.spec.ts` | `ZoneService` | 4 tests |
| `src/tests/zoneRepository.spec.ts` | `ZoneRepository` | 9 tests |
| `src/tests/vehicleRepository.spec.ts` | `VehicleRepository` | 5 tests |
| `src/tests/planRepository.spec.ts` | `PlanRepository` | 7 tests |
| `src/tests/statusRepository.spec.ts` | `StatusRepository` | 8 tests |

---

## 1. EvacuationService Tests

**ไฟล์:** `src/tests/evacuationService.spec.ts`

**Mocks:**
- `../utils/config` → mock `logger` และ `redis`
- `../repositories/zoneRepository` → mock ทั้ง module
- `../repositories/vehicleRepository` → mock ทั้ง module
- `../repositories/planRepository` → mock ทั้ง module
- `../repositories/statusRepository` → mock ทั้ง module
- `../services/geoService` → mock `haversineDistance` และ `calculateETA`

**Setup:**
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // reset mocks ก่อนทุก test
});

afterAll(async () => {
  await redis.quit(); // ปิด Redis connection เพื่อไม่ให้ Jest process ค้าง
});
```

---

### Test Cases: `generatePlan`

#### ✅ `should assign a vehicle to the most urgent zone`

**Scenario:** มี 2 โซน (Z1: urgency 2, Z2: urgency 5) และ 1 ยานพาหนะ

**Expected:**
- Plan มี 1 assignment
- ยานพาหนะถูกส่งไป Z2 (urgency สูงกว่า)
- `NumberOfPeople = 30` (needed 30, capacity 40 → ใช้ 30)
- `PlanRepository.savePlan` ถูกเรียกด้วย plan ที่ถูกต้อง

```typescript
expect(plan).toHaveLength(1);
expect(plan[0].ZoneID).toBe('Z2');
expect(plan[0].VehicleID).toBe('V1');
expect(plan[0].NumberOfPeople).toBe(30);
expect(plan[0].ETA).toBe('10 minutes');
expect(PlanRepository.savePlan).toHaveBeenCalledWith(plan);
```

---

#### ✅ `should allocate multiple vehicles if needed for a single zone`

**Scenario:** มี 1 โซน (100 คน) และ 3 ยานพาหนะ (แต่ละคัน capacity 40)

**Expected:**
- Plan มี 3 assignments
- V1 รับ 40 คน, V2 รับ 40 คน, V3 รับ 20 คน (ที่เหลือ)

```typescript
expect(plan).toHaveLength(3);
expect(plan[0].NumberOfPeople).toBe(40);
expect(plan[1].NumberOfPeople).toBe(40);
expect(plan[2].NumberOfPeople).toBe(20);
```

---

#### ✅ `should return empty plan if no vehicles available`

**Scenario:** มีโซน แต่ไม่มียานพาหนะ

**Expected:**
- Plan เป็น empty array `[]`

```typescript
expect(plan).toHaveLength(0);
```

---

#### ✅ `should not assign vehicles to a zone with 0 remaining people`

**Scenario:** โซน Z1 มี `RemainingPeople = 0` (อพยพครบแล้ว)

**Expected:**
- Plan เป็น empty array `[]` — ไม่จัดสรรยานพาหนะให้โซนที่ครบแล้ว

```typescript
expect(plan).toHaveLength(0);
```

---

## 2. GeoService Tests

**ไฟล์:** `src/tests/geoService.spec.ts`

ไม่มี mock — test ของจริงกับ `geolib` library

---

### Test Cases: `haversineDistance`

#### ✅ `should calculate the distance between two same points as 0`

```typescript
const coord1 = { latitude: 13.7563, longitude: 100.5018 };
const coord2 = { latitude: 13.7563, longitude: 100.5018 };
expect(GeoService.haversineDistance(coord1, coord2)).toBe(0);
```

---

#### ✅ `should calculate the correct distance between two different points`

**Bangkok → Chiang Mai ≈ 580 km**

```typescript
const coord1 = { latitude: 13.7563, longitude: 100.5018 }; // Bangkok
const coord2 = { latitude: 18.7883, longitude: 98.9853 };  // Chiang Mai

const distance = GeoService.haversineDistance(coord1, coord2);
expect(distance).toBeGreaterThan(570);
expect(distance).toBeLessThan(590);
```

---

### Test Cases: `calculateETA`

#### ✅ `should return "Unknown" if speed is 0 or less`

```typescript
expect(GeoService.calculateETA(100, 0)).toBe('Unknown');
expect(GeoService.calculateETA(100, -10)).toBe('Unknown');
```

---

#### ✅ `should format minutes correctly for less than 60 minutes`

```typescript
expect(GeoService.calculateETA(30, 60)).toBe('30 minutes');
expect(GeoService.calculateETA(1, 60)).toBe('1 minute');   // singular
```

---

#### ✅ `should format hours correctly for exactly round hours`

```typescript
expect(GeoService.calculateETA(60, 60)).toBe('1 hour');
expect(GeoService.calculateETA(120, 60)).toBe('2 hours');
```

---

#### ✅ `should format hours and minutes correctly`

```typescript
expect(GeoService.calculateETA(90, 60)).toBe('1 hour 30 minutes');
expect(GeoService.calculateETA(121, 60)).toBe('2 hours 1 minute');
```

---

## 3. ErrorHandler Tests

**ไฟล์:** `src/tests/errorHandler.spec.ts`

**Mocks:**
- `../utils/config` → mock `logger.error`

**Setup:**
```typescript
beforeEach(() => {
  mockRequest = {};
  mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  mockNext = jest.fn();
  jest.clearAllMocks();
});
```

---

### Test Cases

#### ✅ `should log the error and return 500 status with error message`

**Scenario:** Error object ปกติที่มี `.message`

```typescript
const error = new Error('Test error message');
ErrorHandler.handle(error, mockRequest, mockResponse, mockNext);

expect(logger.error).toHaveBeenCalledWith(error, 'Unhandled Error');
expect(mockResponse.status).toHaveBeenCalledWith(500);
expect(mockResponse.json).toHaveBeenCalledWith({
  error: 'Internal Server Error',
  message: 'Test error message',
});
```

---

#### ✅ `should return default message if error has no message`

**Scenario:** Error ที่ไม่ใช่ `Error` instance (เช่น plain object `{}`)

```typescript
const error = {};
ErrorHandler.handle(error, mockRequest, mockResponse, mockNext);

expect(mockResponse.json).toHaveBeenCalledWith({
  error: 'Internal Server Error',
  message: 'An unexpected error occurred.',
});
```

---

## Mocking Strategy

### Repository Mocks

```typescript
jest.mock('../repositories/zoneRepository');
// ทำให้ทุก method ใน ZoneRepository กลายเป็น jest.fn()

(ZoneRepository.getZones as jest.Mock).mockResolvedValue(mockZones);
// กำหนดค่า return ของ mock
```

### GeoService Mock

```typescript
jest.mock('../services/geoService');

(GeoService.haversineDistance as jest.Mock).mockReturnValue(10);
(GeoService.calculateETA as jest.Mock).mockReturnValue('10 minutes');
```

### Config Mock (Redis/Logger)

```typescript
jest.mock('../utils/config', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  redis: { on: jest.fn(), quit: jest.fn() },
}));
```

> **เหตุผล:** mock `redis` เพื่อไม่ให้ test พยายาม connect Redis จริง และ mock `logger` เพื่อไม่ให้ print log ระหว่าง test

---

## Test Coverage Areas

| Area | Covered | หมายเหตุ |
|---|---|---|
| Vehicle priority by urgency | ✅ | `evacuationService.spec.ts` |
| Multi-vehicle allocation | ✅ | `evacuationService.spec.ts` |
| No vehicles edge case | ✅ | `evacuationService.spec.ts` |
| Fully evacuated zone skip | ✅ | `evacuationService.spec.ts` |
| Haversine distance (same point) | ✅ | `geoService.spec.ts` |
| Haversine distance (real coords) | ✅ | `geoService.spec.ts` |
| ETA with zero/negative speed | ✅ | `geoService.spec.ts` |
| ETA formatting (minutes) | ✅ | `geoService.spec.ts` |
| ETA formatting (hours) | ✅ | `geoService.spec.ts` |
| ETA formatting (hours + minutes) | ✅ | `geoService.spec.ts` |
| Error handler with Error instance | ✅ | `errorHandler.spec.ts` |
| Error handler with non-Error | ✅ | `errorHandler.spec.ts` |
| HttpError handling (404, 409) | ✅ | `errorHandler.spec.ts` |
| ZoneService add success | ✅ | `zoneService.spec.ts` |
| ZoneService duplicate check (409) | ✅ | `zoneService.spec.ts` |
| ZoneService call order (check before add) | ✅ | `zoneService.spec.ts` |
| ZoneRepository.addZone (SQLite + Redis init) | ✅ | `zoneRepository.spec.ts` |
| ZoneRepository.getZones (mapping) | ✅ | `zoneRepository.spec.ts` |
| ZoneRepository.getZone (found / not found) | ✅ | `zoneRepository.spec.ts` |
| ZoneRepository.clearZones | ✅ | `zoneRepository.spec.ts` |
| VehicleRepository.addVehicle (mapping) | ✅ | `vehicleRepository.spec.ts` |
| VehicleRepository.getVehicles (mapping) | ✅ | `vehicleRepository.spec.ts` |
| VehicleRepository.clearVehicles | ✅ | `vehicleRepository.spec.ts` |
| PlanRepository.savePlan (atomic transaction) | ✅ | `planRepository.spec.ts` |
| PlanRepository.getPlan (found / null) | ✅ | `planRepository.spec.ts` |
| PlanRepository.clearPlans | ✅ | `planRepository.spec.ts` |
| StatusRepository.getStatuses (Redis HGETALL) | ✅ | `statusRepository.spec.ts` |
| StatusRepository.getStatus (found / null) | ✅ | `statusRepository.spec.ts` |
| StatusRepository.updateStatus (HSET) | ✅ | `statusRepository.spec.ts` |
| StatusRepository.clearStatuses (DEL) | ✅ | `statusRepository.spec.ts` |

---

## Postman Integration Tests

นอกจาก unit tests ยังมี Postman Collection สำหรับ integration/E2E testing:

**ไฟล์:** `postman/tt-interview-api.postman_collection.json`

**วิธีรัน:**
```bash
# ติดตั้ง Newman (Postman CLI)
npm install -g newman

# รัน collection
newman run postman/tt-interview-api.postman_collection.json
```

ดูรายละเอียด test cases ทั้งหมดใน [api.md](./api.md#postman-collection)
