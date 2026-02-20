# Data Models & Schemas

ทุก model ใช้ **Zod** สำหรับ runtime validation และ TypeScript type inference

---

## 1. LocationCoordinates

**ไฟล์:** `src/models/location.ts`

```typescript
const LocationCoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

type LocationCoordinates = z.infer<typeof LocationCoordinatesSchema>;
```

| Field | Type | Description |
|---|---|---|
| `latitude` | number | ละติจูด |
| `longitude` | number | ลองจิจูด |

> ใช้เป็น nested object ใน `EvacuationZone` และ `Vehicle`

---

## 2. EvacuationZone

**ไฟล์:** `src/models/zone.ts`

```typescript
const EvacuationZoneSchema = z.object({
  ZoneID: z.string(),
  LocationCoordinates: LocationCoordinatesSchema,
  NumberOfPeople: z.number().int().positive(),
  UrgencyLevel: z.number().int().min(1).max(5),
});

type EvacuationZone = z.infer<typeof EvacuationZoneSchema>;
```

| Field | Type | Validation | Description |
|---|---|---|---|
| `ZoneID` | string | required | รหัสโซนอพยพ (Primary Key) |
| `LocationCoordinates` | object | required | พิกัด GPS ของโซน |
| `NumberOfPeople` | integer | > 0 | จำนวนคนในโซน |
| `UrgencyLevel` | integer | 1–5 | ระดับความเร่งด่วน (5 = เร่งด่วนสูงสุด) |

**Prisma Model (SQLite Table: `zones`)**
```prisma
model Zone {
  ZoneID        String @id
  Latitude      Float
  Longitude     Float
  NumberOfPeople Int
  UrgencyLevel  Int
}
```

> หมายเหตุ: `LocationCoordinates` ถูก flatten เป็น `Latitude` / `Longitude` ใน database

---

## 3. Vehicle

**ไฟล์:** `src/models/vehicle.ts`

```typescript
const VehicleSchema = z.object({
  VehicleID: z.string(),
  Capacity: z.number().int().positive(),
  Type: z.string(),
  LocationCoordinates: LocationCoordinatesSchema,
  Speed: z.number().positive(),
});

type Vehicle = z.infer<typeof VehicleSchema>;
```

| Field | Type | Validation | Description |
|---|---|---|---|
| `VehicleID` | string | required | รหัสยานพาหนะ (Primary Key) |
| `Capacity` | integer | > 0 | จำนวนคนที่รับได้ต่อเที่ยว |
| `Type` | string | required | ประเภท เช่น `"bus"`, `"truck"` |
| `LocationCoordinates` | object | required | พิกัด GPS ปัจจุบันของยานพาหนะ |
| `Speed` | number | > 0 | ความเร็วเฉลี่ย (km/h) |

**Prisma Model (SQLite Table: `vehicles`)**
```prisma
model Vehicle {
  VehicleID  String @id
  Capacity   Int
  Type       String
  Latitude   Float
  Longitude  Float
  Speed      Float
}
```

---

## 4. EvacuationAssignment

**ไฟล์:** `src/models/evacuation.ts`

ผลลัพธ์จากการสร้างแผนอพยพ — แสดงว่ายานพาหนะคันไหนถูกส่งไปโซนไหน

```typescript
const EvacuationAssignmentSchema = z.object({
  ZoneID: z.string(),
  VehicleID: z.string(),
  ETA: z.string(),
  NumberOfPeople: z.number().int().positive(),
});

type EvacuationAssignment = z.infer<typeof EvacuationAssignmentSchema>;
```

| Field | Type | Description |
|---|---|---|
| `ZoneID` | string | โซนที่ยานพาหนะถูกส่งไป |
| `VehicleID` | string | รหัสยานพาหนะที่ถูกจัดสรร |
| `ETA` | string | เวลาที่คาดว่าจะถึง เช่น `"10 minutes"`, `"1 hour 30 minutes"` |
| `NumberOfPeople` | integer | จำนวนคนที่ยานพาหนะนี้จะรับ |

**Prisma Model (SQLite Table: `plans`)**
```prisma
model Plan {
  id             Int    @id @default(autoincrement())
  ZoneID         String
  VehicleID      String
  ETA            String
  NumberOfPeople Int
}
```

---

## 5. EvacuationStatus

**ไฟล์:** `src/models/evacuation.ts`

ติดตามสถานะการอพยพของแต่ละโซน — เก็บใน **Redis** (ไม่ใช่ SQLite)

```typescript
const EvacuationStatusSchema = z.object({
  ZoneID: z.string(),
  TotalEvacuated: z.number().int().nonnegative(),
  RemainingPeople: z.number().int().nonnegative(),
});

type EvacuationStatus = z.infer<typeof EvacuationStatusSchema>;
```

| Field | Type | Validation | Description |
|---|---|---|---|
| `ZoneID` | string | required | รหัสโซน |
| `TotalEvacuated` | integer | >= 0 | จำนวนคนที่ถูกอพยพออกไปแล้ว |
| `RemainingPeople` | integer | >= 0 | จำนวนคนที่ยังเหลืออยู่ในโซน |

**Redis Storage:**
- Key: `evacuation:status` (Hash)
- Field: `ZoneID`
- Value: JSON string ของ `EvacuationStatus`

```
HSET evacuation:status Z1 '{"ZoneID":"Z1","TotalEvacuated":60,"RemainingPeople":40}'
```

**Invariant:** `TotalEvacuated + RemainingPeople = NumberOfPeople` (ของโซน)

---

## 6. UpdateEvacuation

**ไฟล์:** `src/models/evacuation.ts`

Input สำหรับ endpoint `PUT /api/evacuations/update`

```typescript
const UpdateEvacuationSchema = z.object({
  ZoneID: z.string(),
  VehicleID: z.string(),
  EvacueesMoved: z.number().int().positive(),
});

type UpdateEvacuation = z.infer<typeof UpdateEvacuationSchema>;
```

| Field | Type | Validation | Description |
|---|---|---|---|
| `ZoneID` | string | required | โซนที่ต้องการอัปเดต |
| `VehicleID` | string | required | ยานพาหนะที่ทำการอพยพ |
| `EvacueesMoved` | integer | > 0 | จำนวนคนที่อพยพในรอบนี้ |

---

## ความสัมพันธ์ระหว่าง Models

```
EvacuationZone (SQLite)
    │
    ├── ZoneID ──────────────────────────────┐
    │                                        │
    ▼                                        ▼
EvacuationStatus (Redis)           EvacuationAssignment (SQLite)
    ZoneID                              ZoneID
    TotalEvacuated                      VehicleID ──────── Vehicle (SQLite)
    RemainingPeople                     ETA
                                        NumberOfPeople
```

---

## Constants ที่เกี่ยวข้อง

**ไฟล์:** `src/utils/constants.ts`

```typescript
export const VEHICLE_SCORE_PENALTY = {
  UNDER_CAPACITY: 10,        // penalty เมื่อ capacity < needed
  OVER_CAPACITY: 5,          // penalty เมื่อ capacity > needed * 2
  OVER_CAPACITY_MULTIPLIER: 2,
} as const;

export const REDIS_KEYS = {
  EVACUATION_STATUS: 'evacuation:status',
} as const;

export const ETA = {
  UNKNOWN: 'Unknown',        // เมื่อ speed <= 0
  ZERO_MINUTES: '0 minutes', // เมื่อ distance = 0
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  ZONE_ALREADY_EXISTS: 'Zone already exists',
  ZONE_STATUS_NOT_FOUND: 'Zone status not found',
} as const;
```
