# Repositories (Data Access Layer)

Repositories เป็น layer ที่รับผิดชอบการติดต่อกับ database โดยตรง ทั้ง SQLite (ผ่าน Prisma) และ Redis (ผ่าน ioredis)

---

## Storage Overview

| Repository | Storage | เหตุผล |
|---|---|---|
| `ZoneRepository` | SQLite + Redis | เก็บข้อมูลโซน (persistent) + init status (real-time) |
| `VehicleRepository` | SQLite | เก็บข้อมูลยานพาหนะ (persistent) |
| `PlanRepository` | SQLite | เก็บแผนการอพยพล่าสุด (persistent) |
| `StatusRepository` | Redis | ติดตามสถานะแบบ real-time (fast read/write) |

---

## 1. ZoneRepository

**ไฟล์:** `src/repositories/zoneRepository.ts`

จัดการข้อมูลโซนอพยพใน SQLite และ initialize status ใน Redis เมื่อเพิ่มโซนใหม่

### Methods

#### `addZone(zone: EvacuationZone): Promise<void>`

บันทึกโซนใหม่ลง SQLite และสร้าง evacuation status เริ่มต้นใน Redis

```typescript
static async addZone(zone: EvacuationZone): Promise<void> {
  await prisma.zone.create({
    data: {
      ZoneID: zone.ZoneID,
      Latitude: zone.LocationCoordinates.latitude,
      Longitude: zone.LocationCoordinates.longitude,
      NumberOfPeople: zone.NumberOfPeople,
      UrgencyLevel: zone.UrgencyLevel,
    },
  });

  // Initialize Redis status
  const status: EvacuationStatus = {
    ZoneID: zone.ZoneID,
    TotalEvacuated: 0,
    RemainingPeople: zone.NumberOfPeople,
  };
  await redis.hset(STATUS_KEY, zone.ZoneID, JSON.stringify(status));
}
```

**Side Effect:** สร้าง `EvacuationStatus` ใน Redis hash `evacuation:status` โดยอัตโนมัติ

---

#### `getZones(): Promise<EvacuationZone[]>`

ดึงโซนทั้งหมดจาก SQLite แล้ว map กลับเป็น `EvacuationZone` (รวม `LocationCoordinates` object)

```typescript
static async getZones(): Promise<EvacuationZone[]> {
  const rows = await prisma.zone.findMany();
  return rows.map(toEvacuationZone);
}
```

**Mapper `toEvacuationZone`:** แปลง flat `Latitude`/`Longitude` กลับเป็น `LocationCoordinates` object

---

#### `getZone(zoneId: string): Promise<EvacuationZone | null>`

ดึงโซนเดียวตาม `ZoneID` — ใช้สำหรับ duplicate check และ update status

```typescript
static async getZone(zoneId: string): Promise<EvacuationZone | null> {
  const row = await prisma.zone.findUnique({ where: { ZoneID: zoneId } });
  return row ? toEvacuationZone(row) : null;
}
```

---

#### `clearZones(): Promise<void>`

ลบโซนทั้งหมดจาก SQLite

```typescript
static async clearZones(): Promise<void> {
  await prisma.zone.deleteMany();
}
```

---

## 2. VehicleRepository

**ไฟล์:** `src/repositories/vehicleRepository.ts`

จัดการข้อมูลยานพาหนะใน SQLite

### Methods

#### `addVehicle(vehicle: Vehicle): Promise<void>`

บันทึกยานพาหนะใหม่ลง SQLite

```typescript
static async addVehicle(vehicle: Vehicle): Promise<void> {
  await prisma.vehicle.create({
    data: {
      VehicleID: vehicle.VehicleID,
      Capacity: vehicle.Capacity,
      Type: vehicle.Type,
      Latitude: vehicle.LocationCoordinates.latitude,
      Longitude: vehicle.LocationCoordinates.longitude,
      Speed: vehicle.Speed,
    },
  });
}
```

---

#### `getVehicles(): Promise<Vehicle[]>`

ดึงยานพาหนะทั้งหมดจาก SQLite

```typescript
static async getVehicles(): Promise<Vehicle[]> {
  const rows = await prisma.vehicle.findMany();
  return rows.map(toVehicle);
}
```

**Mapper `toVehicle`:** แปลง flat `Latitude`/`Longitude` กลับเป็น `LocationCoordinates` object

---

#### `clearVehicles(): Promise<void>`

ลบยานพาหนะทั้งหมดจาก SQLite

---

## 3. PlanRepository

**ไฟล์:** `src/repositories/planRepository.ts`

จัดการแผนการอพยพใน SQLite — ใช้ **atomic transaction** เพื่อให้แน่ใจว่าแผนใหม่แทนที่แผนเก่าเสมอ

### Methods

#### `savePlan(assignments: EvacuationAssignment[]): Promise<void>`

บันทึกแผนใหม่ลง SQLite โดยลบแผนเก่าก่อน (atomic transaction)

```typescript
static async savePlan(assignments: EvacuationAssignment[]): Promise<void> {
  await prisma.$transaction([
    prisma.plan.deleteMany(),          // ลบแผนเก่าทั้งหมด
    prisma.plan.createMany({           // สร้างแผนใหม่ทั้งหมดพร้อมกัน
      data: assignments.map(a => ({
        ZoneID: a.ZoneID,
        VehicleID: a.VehicleID,
        ETA: a.ETA,
        NumberOfPeople: a.NumberOfPeople,
      })),
    }),
  ]);
}
```

**Transaction Guarantee:** ถ้า `createMany` ล้มเหลว `deleteMany` จะถูก rollback — ไม่มีสถานะ "ไม่มีแผน"

---

#### `getPlan(): Promise<EvacuationAssignment[] | null>`

ดึงแผนปัจจุบันจาก SQLite — return `null` ถ้าไม่มีแผน

```typescript
static async getPlan(): Promise<EvacuationAssignment[] | null> {
  const rows = await prisma.plan.findMany();
  if (rows.length === 0) return null;
  return rows.map(row => ({
    ZoneID: row.ZoneID,
    VehicleID: row.VehicleID,
    ETA: row.ETA,
    NumberOfPeople: row.NumberOfPeople,
  }));
}
```

---

#### `clearPlans(): Promise<void>`

ลบแผนทั้งหมดจาก SQLite

---

## 4. StatusRepository

**ไฟล์:** `src/repositories/statusRepository.ts`

จัดการสถานะการอพยพใน **Redis** ใช้ Redis Hash structure

**Redis Key:** `evacuation:status` (constant จาก `REDIS_KEYS.EVACUATION_STATUS`)

**Data Structure:**
```
Hash: "evacuation:status"
  Field "Z1" → '{"ZoneID":"Z1","TotalEvacuated":60,"RemainingPeople":40}'
  Field "Z2" → '{"ZoneID":"Z2","TotalEvacuated":0,"RemainingPeople":50}'
```

### Methods

#### `getStatuses(): Promise<EvacuationStatus[]>`

ดึงสถานะทุกโซนจาก Redis Hash

```typescript
static async getStatuses(): Promise<EvacuationStatus[]> {
  const data = await redis.hgetall(STATUS_KEY);
  return Object.values(data).map(item => JSON.parse(item));
}
```

- ใช้ `HGETALL` — ดึงทุก field ใน hash พร้อมกัน
- Parse JSON string กลับเป็น `EvacuationStatus` object

---

#### `getStatus(zoneId: string): Promise<EvacuationStatus | null>`

ดึงสถานะของโซนเดียว

```typescript
static async getStatus(zoneId: string): Promise<EvacuationStatus | null> {
  const data = await redis.hget(STATUS_KEY, zoneId);
  return data ? JSON.parse(data) : null;
}
```

- ใช้ `HGET` — ดึง field เดียวจาก hash

---

#### `updateStatus(status: EvacuationStatus): Promise<void>`

อัปเดตสถานะของโซน

```typescript
static async updateStatus(status: EvacuationStatus): Promise<void> {
  await redis.hset(STATUS_KEY, status.ZoneID, JSON.stringify(status));
}
```

- ใช้ `HSET` — set field ใน hash (overwrite ถ้ามีอยู่แล้ว)

---

#### `clearStatuses(): Promise<void>`

ลบ Redis hash key ทั้งหมด

```typescript
static async clearStatuses(): Promise<void> {
  await redis.del(STATUS_KEY);
}
```

- ใช้ `DEL` — ลบ key ทั้งหมด

---

## Database Clients

### Prisma Client (SQLite)

**ไฟล์:** `src/utils/prisma.ts`

```typescript
import { PrismaClient } from '../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const url = (process.env.DATABASE_URL ?? 'file:./evacuation.sqlite').replace('file:', '');
const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });
```

- ใช้ `@prisma/adapter-better-sqlite3` เป็น driver adapter
- Default database file: `./evacuation.sqlite`
- Prisma client ถูก generate ไปที่ `src/generated/prisma`

### Redis Client (ioredis)

**ไฟล์:** `src/utils/config.ts`

```typescript
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err) => logger.error(err, 'Redis Client Error'));
redis.on('connect', () => logger.info('Connected to Redis successfully'));
```

- `maxRetriesPerRequest: null` — retry ไม่จำกัดครั้ง
- `enableReadyCheck: false` — ไม่รอ ready check ก่อน execute command
- Log error และ connect events ด้วย pino

---

## Data Mapping Pattern

ทั้ง `ZoneRepository` และ `VehicleRepository` ใช้ mapper function เพื่อแปลง Prisma row (flat) กลับเป็น domain model (nested):

```
Prisma Row (flat)          Domain Model (nested)
─────────────────          ─────────────────────
ZoneID: "Z1"         →     ZoneID: "Z1"
Latitude: 13.75      →     LocationCoordinates: {
Longitude: 100.50    →       latitude: 13.75,
NumberOfPeople: 100  →       longitude: 100.50
UrgencyLevel: 5      →     }
                     →     NumberOfPeople: 100
                     →     UrgencyLevel: 5
```
