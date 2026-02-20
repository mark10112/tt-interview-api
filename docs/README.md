# TT Interview API — Documentation

ระบบ API สำหรับบริหารจัดการแผนการอพยพประชาชนในกรณีฉุกเฉิน

---

## สารบัญ (Table of Contents)

| ไฟล์ | หัวข้อ | เนื้อหา |
|---|---|---|
| [overview.md](./overview.md) | Project Overview | Tech stack, architecture, file structure, data flow, environment variables |
| [api.md](./api.md) | API Reference | Endpoints, request/response format, error codes, middleware pipeline |
| [data-models.md](./data-models.md) | Data Models & Schemas | Zod schemas, TypeScript types, Prisma models, Redis structure, constants |
| [services.md](./services.md) | Services (Business Logic) | EvacuationService algorithm, GeoService, ZoneService, vehicle scoring |
| [repositories.md](./repositories.md) | Repositories (Data Access) | SQLite/Redis operations, Prisma client, data mapping patterns |
| [infrastructure.md](./infrastructure.md) | Infrastructure & Deployment | Docker, CI/CD (GitHub Actions → Azure), TypeScript config, logging |
| [testing.md](./testing.md) | Testing | Unit tests (Jest), test cases, mocking strategy, Postman integration tests |

---

## Quick Start

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตั้งค่า environment variables
cp .env-example .env
# แก้ไข REDIS_URL และ DATABASE_URL ตามต้องการ

# 3. รัน database migration
npx prisma migrate dev

# 4. Start development server
npm run dev

# 5. รัน tests
npm test
```

**หรือใช้ Docker Compose:**
```bash
docker-compose up -d
```

---

## API Endpoints Summary

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/evacuation-zones` | เพิ่มโซนอพยพ |
| `POST` | `/api/vehicles` | เพิ่มยานพาหนะ |
| `POST` | `/api/evacuations/plan` | สร้างแผนการอพยพ |
| `GET` | `/api/evacuations/status` | ดูสถานะการอพยพทุกโซน |
| `PUT` | `/api/evacuations/update` | อัปเดตจำนวนผู้ถูกอพยพ |
| `DELETE` | `/api/evacuations/clear` | ลบข้อมูลทั้งหมด |

---

## Architecture Diagram

```
HTTP Request
     │
     ▼
┌─────────────┐
│  Controller │  ← Validate (Zod) → Call Service
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ← Business Logic, Algorithm
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  ← Data Access
└──────┬──────┘
       │
  ┌────┴────┐
  ▼         ▼
SQLite    Redis
(Zones,   (Status)
Vehicles,
Plans)
```

---

## Key Design Decisions

- **SQLite** ใช้สำหรับข้อมูล persistent (zones, vehicles, plans) ผ่าน Prisma ORM
- **Redis** ใช้สำหรับ real-time status tracking (evacuation progress) เพราะ fast read/write
- **Zod** ใช้สำหรับ runtime validation และ TypeScript type inference ในที่เดียวกัน
- **Vehicle Scoring Algorithm** — คะแนนต่ำ = ดีกว่า: `score = distance_km + capacity_penalty`
- **Atomic Transaction** ใน `PlanRepository.savePlan` — ลบแผนเก่าและสร้างแผนใหม่ใน transaction เดียว
- **Urgency-first Allocation** — โซนที่มี `UrgencyLevel` สูงกว่าได้รับยานพาหนะก่อน
