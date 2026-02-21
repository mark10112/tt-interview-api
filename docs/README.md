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

## Tech Stack

| ประเภท | เทคโนโลยี | เวอร์ชัน |
|---|---|---|
| Runtime | Node.js | >= 18.0.0 |
| Framework | Express | ^5.2.1 |
| Language | TypeScript | ^5.9.3 |
| ORM | Prisma | ^7.4.1 |
| Database (Persistent) | SQLite (via better-sqlite3) | ^12.6.2 |
| Database (Cache) | Redis (via ioredis) | ^5.9.3 |
| Validation | Zod | ^4.3.6 |
| Geo Calculation | geolib | ^3.3.4 |
| Logger | pino + pino-pretty | ^10.3.1 |
| Testing | Jest + ts-jest | ^30.2.0 |
| Containerization | Docker + Docker Compose | — |
| CI/CD | GitHub Actions → Azure Web App | — |

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

## หมายเหตุ

### ส่วนที่ใช้ AI ช่วย
- **เขียน Unit Tests** — ใช้ AI ช่วย generate test cases สำหรับ services และ repositories (Jest)
- **เขียน Documentation** — ใช้ AI ช่วยร่างและจัดโครงสร้างไฟล์ docs ทั้งหมด
- **Debug และ Fix Bugs** — ใช้ AI ช่วยวิเคราะห์ error และแนะนำแนวทางแก้ไข
- **Boilerplate / Setup** — ใช้ AI ช่วยตั้งค่า Docker, GitHub Actions workflow, Prisma schema เบื้องต้น

### ส่วนที่ไม่ได้ใช้ AI (เขียนเอง)
- **Business Logic หลัก** — Vehicle Scoring Algorithm, Urgency-first Allocation, และ logic การจับคู่ยานพาหนะกับโซนใน `EvacuationService`
- **Architecture Design** — การออกแบบ layered architecture (Controller → Service → Repository), การเลือก Tech Stack
- **Data Model** — การออกแบบ Zod schemas และ Prisma models ให้สอดคล้องกับ requirement
