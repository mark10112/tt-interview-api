# API Reference

Base URL: `http://localhost:3000`

Content-Type: `application/json` (สำหรับ request ที่มี body)

---

## 1. Zones (โซนอพยพ)

### POST `/api/evacuation-zones`
เพิ่มโซนอพยพใหม่เข้าระบบ และสร้าง evacuation status เริ่มต้นใน Redis

**Request Body**
```json
{
  "ZoneID": "Z1",
  "LocationCoordinates": {
    "latitude": 13.7563,
    "longitude": 100.5018
  },
  "NumberOfPeople": 100,
  "UrgencyLevel": 5
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `ZoneID` | string | ✅ | ไม่ซ้ำกัน |
| `LocationCoordinates.latitude` | number | ✅ | - |
| `LocationCoordinates.longitude` | number | ✅ | - |
| `NumberOfPeople` | integer | ✅ | > 0 |
| `UrgencyLevel` | integer | ✅ | 1–5 |

**Responses**

| Status | Description | Body |
|---|---|---|
| `201 Created` | เพิ่มโซนสำเร็จ | ข้อมูลโซนที่เพิ่ม |
| `400 Bad Request` | Validation ไม่ผ่าน | `{ "error": "Validation Error", "details": [...] }` |
| `409 Conflict` | ZoneID ซ้ำ | `{ "error": "Zone already exists" }` |

**ตัวอย่าง Response 201**
```json
{
  "ZoneID": "Z1",
  "LocationCoordinates": { "latitude": 13.7563, "longitude": 100.5018 },
  "NumberOfPeople": 100,
  "UrgencyLevel": 5
}
```

**Side Effect:** เมื่อเพิ่มโซนสำเร็จ ระบบจะสร้าง `EvacuationStatus` ใน Redis โดยอัตโนมัติ:
```json
{
  "ZoneID": "Z1",
  "TotalEvacuated": 0,
  "RemainingPeople": 100
}
```

---

## 2. Vehicles (ยานพาหนะ)

### POST `/api/vehicles`
เพิ่มยานพาหนะใหม่เข้าระบบ

**Request Body**
```json
{
  "VehicleID": "V1",
  "Capacity": 40,
  "Type": "bus",
  "LocationCoordinates": {
    "latitude": 13.8,
    "longitude": 100.6
  },
  "Speed": 60
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `VehicleID` | string | ✅ | - |
| `Capacity` | integer | ✅ | > 0 |
| `Type` | string | ✅ | เช่น `"bus"`, `"truck"` |
| `LocationCoordinates.latitude` | number | ✅ | - |
| `LocationCoordinates.longitude` | number | ✅ | - |
| `Speed` | number | ✅ | > 0 (km/h) |

**Responses**

| Status | Description | Body |
|---|---|---|
| `201 Created` | เพิ่มยานพาหนะสำเร็จ | ข้อมูลยานพาหนะที่เพิ่ม |
| `400 Bad Request` | Validation ไม่ผ่าน | `{ "error": "Validation Error", "details": [...] }` |

**ตัวอย่าง Response 201**
```json
{
  "VehicleID": "V1",
  "Capacity": 40,
  "Type": "bus",
  "LocationCoordinates": { "latitude": 13.8, "longitude": 100.6 },
  "Speed": 60
}
```

---

## 3. Evacuations (การอพยพ)

### POST `/api/evacuations/plan`
สร้างแผนการอพยพโดยอัตโนมัติ จัดสรรยานพาหนะให้กับโซนตามลำดับความเร่งด่วน

- ไม่ต้องการ Request Body
- ดึงข้อมูลโซน, ยานพาหนะ, และสถานะปัจจุบันจาก database
- เรียงโซนตาม `UrgencyLevel` จากมากไปน้อย
- บันทึกแผนลง SQLite (แทนที่แผนเก่า)

**Responses**

| Status | Description | Body |
|---|---|---|
| `200 OK` | สร้างแผนสำเร็จ | `EvacuationAssignment[]` |

**ตัวอย่าง Response 200**
```json
[
  {
    "ZoneID": "Z1",
    "VehicleID": "V1",
    "ETA": "10 minutes",
    "NumberOfPeople": 60
  },
  {
    "ZoneID": "Z1",
    "VehicleID": "V2",
    "ETA": "15 minutes",
    "NumberOfPeople": 40
  },
  {
    "ZoneID": "Z2",
    "VehicleID": "V3",
    "ETA": "8 minutes",
    "NumberOfPeople": 50
  }
]
```

> หากไม่มีข้อมูลโซนหรือยานพาหนะ จะ return `[]`

---

### GET `/api/evacuations/status`
ดึงสถานะการอพยพของทุกโซน (จาก Redis)

- ไม่ต้องการ Request Body หรือ Query Parameter

**Responses**

| Status | Description | Body |
|---|---|---|
| `200 OK` | ดึงข้อมูลสำเร็จ | `EvacuationStatus[]` |

**ตัวอย่าง Response 200**
```json
[
  {
    "ZoneID": "Z1",
    "TotalEvacuated": 60,
    "RemainingPeople": 40
  },
  {
    "ZoneID": "Z2",
    "TotalEvacuated": 0,
    "RemainingPeople": 50
  }
]
```

---

### PUT `/api/evacuations/update`
อัปเดตจำนวนผู้ที่ถูกอพยพออกจากโซน

- `TotalEvacuated` จะถูก cap ไม่เกิน `NumberOfPeople` ของโซน
- `RemainingPeople = NumberOfPeople - TotalEvacuated`

**Request Body**
```json
{
  "ZoneID": "Z1",
  "VehicleID": "V1",
  "EvacueesMoved": 40
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `ZoneID` | string | ✅ | ต้องมีอยู่ในระบบ |
| `VehicleID` | string | ✅ | - |
| `EvacueesMoved` | integer | ✅ | > 0 |

**Responses**

| Status | Description | Body |
|---|---|---|
| `200 OK` | อัปเดตสำเร็จ | `EvacuationStatus` ที่อัปเดตแล้ว |
| `400 Bad Request` | Validation ไม่ผ่าน | `{ "error": "Validation Error", "details": [...] }` |
| `404 Not Found` | ไม่พบโซนหรือ status | `{ "error": "Zone status not found" }` |

**ตัวอย่าง Response 200**
```json
{
  "ZoneID": "Z1",
  "TotalEvacuated": 100,
  "RemainingPeople": 0
}
```

---

### DELETE `/api/evacuations/clear`
ลบข้อมูลทั้งหมดออกจากระบบ (โซน, ยานพาหนะ, สถานะ)

> ⚠️ **Destructive Operation** — ลบข้อมูลทั้งหมดใน SQLite และ Redis

- ไม่ต้องการ Request Body
- Idempotent: เรียกซ้ำได้โดยไม่เกิด error

**Responses**

| Status | Description | Body |
|---|---|---|
| `204 No Content` | ลบสำเร็จ | ไม่มี body |

---

## Error Response Format

### Validation Error (400)
```json
{
  "error": "Validation Error",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "number",
      "inclusive": true,
      "exact": false,
      "message": "Number must be greater than or equal to 1",
      "path": ["UrgencyLevel"]
    }
  ]
}
```

### HTTP Error (4xx)
```json
{
  "error": "Zone already exists"
}
```

### Internal Server Error (500)
```json
{
  "error": "Internal Server Error",
  "message": "..."
}
```

---

## Middleware Pipeline

```
Request → CORS → JSON Parser → Routes → [Zod Error Handler] → [Global Error Handler] → Response
```

1. **CORS** — อนุญาตทุก origin
2. **express.json()** — parse JSON body
3. **Routes** — dispatch ไปยัง controller ที่ถูกต้อง
4. **Zod Error Handler** — จับ `ZodError` แปลงเป็น 400 response
5. **Global Error Handler** (`ErrorHandler.handle`) — จับ error ที่เหลือ, log ด้วย pino, ส่ง 500

---

## Postman Collection

ไฟล์ Postman Collection อยู่ที่ `postman/tt-interview-api.postman_collection.json`

Base URL variable: `{{baseUrl}}` = `http://localhost:3000`

### กลุ่ม Test Cases ใน Collection

| กลุ่ม | จำนวน Request | คำอธิบาย |
|---|---|---|
| Zones | 9 | ทดสอบ Add Zone ทั้ง success และ error cases |
| Vehicles | 7 | ทดสอบ Add Vehicle ทั้ง success และ error cases |
| Evacuations | 12 | ทดสอบ Plan, Status, Update, Clear |
| E2E Flow | 11 | ทดสอบ flow ครบวงจรตั้งแต่ต้นจนจบ |
