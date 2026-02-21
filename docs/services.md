# Services (Business Logic Layer)

Services เป็น layer ที่รับผิดชอบ business logic ทั้งหมด ไม่ติดต่อ database โดยตรง แต่ผ่าน Repository

---

## 1. EvacuationService

**ไฟล์:** `src/services/evacuationService.ts`

Service หลักของระบบ รับผิดชอบ algorithm การจัดสรรยานพาหนะและการจัดการสถานะการอพยพ

---

### `generatePlan(): Promise<EvacuationAssignment[]>`

สร้างแผนการอพยพโดยอัตโนมัติ

**ขั้นตอนการทำงาน:**

1. ดึงข้อมูลพร้อมกัน (parallel) ด้วย `Promise.all`:
   - `ZoneRepository.getZones()` — โซนทั้งหมดจาก SQLite
   - `VehicleRepository.getVehicles()` — ยานพาหนะทั้งหมดจาก SQLite
   - `StatusRepository.getStatuses()` — สถานะปัจจุบันจาก Redis

2. สร้าง map `remaining` จาก status: `{ ZoneID → RemainingPeople }`

3. เรียงโซนตาม `UrgencyLevel` จากมากไปน้อย (โซนเร่งด่วนสูงได้รับการจัดสรรก่อน)

4. วนลูปแต่ละโซน เรียก `assignVehiclesToZone()`

5. บันทึกแผนลง SQLite ด้วย `PlanRepository.savePlan()` (atomic transaction)

6. Return `EvacuationAssignment[]`

```typescript
static async generatePlan(): Promise<EvacuationAssignment[]> {
  const [zones, vehicles, statuses] = await Promise.all([
    ZoneRepository.getZones(),
    VehicleRepository.getVehicles(),
    StatusRepository.getStatuses(),
  ]);

  const remaining = Object.fromEntries<number>(
    statuses.map((s) => [s.ZoneID, s.RemainingPeople]),
  );

  const sortedZones = [...zones].sort((a, b) => b.UrgencyLevel - a.UrgencyLevel);
  const availableVehicles = [...vehicles];
  const assignments: EvacuationAssignment[] = [];

  for (const zone of sortedZones) {
    const needed = remaining[zone.ZoneID] ?? 0;
    assignments.push(...assignVehiclesToZone(zone, needed, availableVehicles));
  }

  await PlanRepository.savePlan(assignments);
  return assignments;
}
```

---

### `getStatuses(): Promise<EvacuationStatus[]>`

ดึงสถานะการอพยพของทุกโซนจาก Redis

```typescript
static async getStatuses(): Promise<EvacuationStatus[]> {
  return StatusRepository.getStatuses();
}
```

---

### `updateStatus(input: UpdateEvacuation): Promise<EvacuationStatus>`

อัปเดตจำนวนผู้ที่ถูกอพยพออกจากโซน

**Logic:**
- ดึง `status` และ `zone` พร้อมกัน
- ถ้าไม่พบ → throw `HttpError(404, "Zone status not found")`
- คำนวณ `newTotalEvacuated = Math.min(status.TotalEvacuated + input.EvacueesMoved, zone.NumberOfPeople)`
  - **Cap** ไม่ให้เกิน `NumberOfPeople` ของโซน
- อัปเดต `RemainingPeople = zone.NumberOfPeople - newTotalEvacuated`
- บันทึกลง Redis

```typescript
static async updateStatus(input: UpdateEvacuation): Promise<EvacuationStatus> {
  const [status, zone] = await Promise.all([
    StatusRepository.getStatus(input.ZoneID),
    ZoneRepository.getZone(input.ZoneID),
  ]);

  if (!status || !zone) {
    throw new HttpError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.ZONE_STATUS_NOT_FOUND);
  }

  const newTotalEvacuated = Math.min(
    status.TotalEvacuated + input.EvacueesMoved,
    zone.NumberOfPeople
  );
  status.TotalEvacuated = newTotalEvacuated;
  status.RemainingPeople = zone.NumberOfPeople - newTotalEvacuated;

  await StatusRepository.updateStatus(status);
  return status;
}
```

---

### `clearAll(): Promise<void>`

ลบข้อมูลทั้งหมดพร้อมกัน (parallel):
- `ZoneRepository.clearZones()` — ลบโซนทั้งหมดจาก SQLite
- `VehicleRepository.clearVehicles()` — ลบยานพาหนะทั้งหมดจาก SQLite
- `StatusRepository.clearStatuses()` — ลบ Redis hash key

> หมายเหตุ: Plans ใน SQLite ไม่ถูกลบโดย `clearAll()` — ต้องเรียก `PlanRepository.clearPlans()` แยกต่างหาก

---

## Vehicle Scoring Algorithm

**ฟังก์ชัน Helper (private)** ใช้ภายใน `EvacuationService` เท่านั้น

### `scoreVehicle(vehicle, zone, needed)`

คำนวณ "คะแนน" ของยานพาหนะสำหรับโซนหนึ่ง — **คะแนนต่ำ = ดีกว่า**

```typescript
function scoreVehicle(vehicle: Vehicle, zone: EvacuationZone, needed: number) {
  const distKm = GeoService.haversineDistance(
    vehicle.LocationCoordinates,
    zone.LocationCoordinates
  );

  const capacityPenalty =
    vehicle.Capacity < needed
      ? VEHICLE_SCORE_PENALTY.UNDER_CAPACITY * (needed / vehicle.Capacity)  // proportional ถ้า capacity ไม่พอ
      : vehicle.Capacity > needed * VEHICLE_SCORE_PENALTY.OVER_CAPACITY_MULTIPLIER
        ? VEHICLE_SCORE_PENALTY.OVER_CAPACITY          // +10 ถ้า capacity มากเกิน 2x
        : 0;                                           // 0 ถ้า capacity พอดี

  return { score: distKm + capacityPenalty, distKm };
}
```

**Penalty Rules:**

| เงื่อนไข | Penalty | เหตุผล |
|---|---|---|
| `capacity < needed` | `+5 × (needed / capacity)` | Proportional — ยิ่งเล็กกว่า needed มาก ยิ่งโดน penalty สูง |
| `capacity > needed × 2` | +10 | ยานพาหนะใหญ่เกินไป สิ้นเปลือง |
| `needed ≤ capacity ≤ needed × 2` | 0 | พอดีหรือใกล้เคียง |

**Score = ระยะทาง (km) + penalty**

---

### `pickBestVehicle(vehicles, zone, needed)`

เลือกยานพาหนะที่มีคะแนนต่ำสุด (ดีที่สุด) จาก list

```typescript
function pickBestVehicle(vehicles: Vehicle[], zone: EvacuationZone, needed: number) {
  //initial values
  let bestIndex = -1;
  let bestDistKm = 0;
  let bestScore = Infinity;

  for (let i = 0; i < vehicles.length; i++) {
    const { score, distKm } = scoreVehicle(vehicles[i], zone, needed);
    if (score < bestScore) {
      bestIndex = i;
      bestDistKm = distKm;
      bestScore = score;
    }
  }

  return { index: bestIndex, distKm: bestDistKm, score: bestScore };
}
```

---

### `assignVehiclesToZone(zone, needed, availableVehicles)`

จัดสรรยานพาหนะให้กับโซนจนกว่าจะครบจำนวนคน หรือยานพาหนะหมด

```typescript
function assignVehiclesToZone(zone, needed, availableVehicles): EvacuationAssignment[] {
  const results: EvacuationAssignment[] = [];
  let remaining = needed;

  while (remaining > 0 && availableVehicles.length > 0) {
    const { index, distKm } = pickBestVehicle(availableVehicles, zone, remaining);
    if (index === -1) break;

    const [vehicle] = availableVehicles.splice(index, 1); // ดึงยานพาหนะออกจาก pool
    const evacuating = Math.min(vehicle.Capacity, remaining);
    remaining -= evacuating;

    results.push({
      ZoneID: zone.ZoneID,
      VehicleID: vehicle.VehicleID,
      ETA: GeoService.calculateETA(distKm, vehicle.Speed),
      NumberOfPeople: evacuating,
    });
  }

  return results;
}
```

**พฤติกรรมสำคัญ:**
- ยานพาหนะที่ถูกใช้แล้วจะถูก **splice ออก** จาก `availableVehicles` (shared pool)
- ยานพาหนะ 1 คันสามารถถูกใช้ได้เพียง 1 โซนเท่านั้น
- ถ้าคนในโซนมากกว่า capacity ของยานพาหนะ จะดึงยานพาหนะหลายคันมาช่วย

---

## 2. ZoneService

**ไฟล์:** `src/services/zoneService.ts`

Service สำหรับจัดการโซนอพยพ

### `addZone(zone: EvacuationZone): Promise<void>`

เพิ่มโซนใหม่พร้อม duplicate check

```typescript
static async addZone(zone: EvacuationZone): Promise<void> {
  const existing = await ZoneRepository.getZone(zone.ZoneID);
  if (existing) {
    throw new HttpError(HTTP_STATUS.CONFLICT, ERROR_MESSAGES.ZONE_ALREADY_EXISTS);
  }
  await ZoneRepository.addZone(zone);
}
```

- ตรวจสอบ `ZoneID` ซ้ำก่อน
- ถ้าซ้ำ → throw `HttpError(409, "Zone already exists")`
- ถ้าไม่ซ้ำ → บันทึกลง SQLite และสร้าง status ใน Redis (ทำใน `ZoneRepository.addZone`)

---

## 3. GeoService

**ไฟล์:** `src/services/geoService.ts`

Service สำหรับคำนวณระยะทางและเวลาเดินทาง ใช้ library **geolib**

### `haversineDistance(coord1, coord2): number`

คำนวณระยะทางระหว่างสองพิกัด GPS โดยใช้สูตร Haversine

```typescript
static haversineDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
  const meters = getDistance(
    { latitude: coord1.latitude, longitude: coord1.longitude },
    { latitude: coord2.latitude, longitude: coord2.longitude },
  );
  return convertDistance(meters, 'km'); // แปลงเป็น km
}
```

- ใช้ `getDistance()` และ `convertDistance()` จาก `geolib`
- Return ระยะทางเป็น **กิโลเมตร (km)**

**ตัวอย่าง:**
- Bangkok (13.7563, 100.5018) → Chiang Mai (18.7883, 98.9853) ≈ 580 km

---

### `calculateETA(distanceKm, speedKmh): string`

คำนวณเวลาที่คาดว่าจะถึง (ETA) และ format เป็น string ที่อ่านง่าย

```typescript
static calculateETA(distanceKm: number, speedKmh: number): string {
  if (speedKmh <= 0) return ETA.UNKNOWN; // "Unknown"

  const totalMinutes = Math.round((distanceKm / speedKmh) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return [h && plural(h, 'hour'), m && plural(m, 'minute')]
    .filter(Boolean)
    .join(' ') || ETA.ZERO_MINUTES; // "0 minutes"
}
```

**ตัวอย่าง Output:**

| distanceKm | speedKmh | ETA |
|---|---|---|
| 100 | 0 | `"Unknown"` |
| 0 | 60 | `"0 minutes"` |
| 30 | 60 | `"30 minutes"` |
| 1 | 60 | `"1 minute"` |
| 60 | 60 | `"1 hour"` |
| 120 | 60 | `"2 hours"` |
| 90 | 60 | `"1 hour 30 minutes"` |
| 121 | 60 | `"2 hours 1 minute"` |

**Plural Rule:** ใช้ `plural(n, unit)` — ถ้า n = 1 ใช้ singular, ถ้า n > 1 ใช้ plural (เติม `s`)
