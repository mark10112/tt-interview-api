# Project Overview

## ชื่อโปรเจกต์
**TT Interview API** — Evacuation Management REST API

## วัตถุประสงค์
ระบบ API สำหรับบริหารจัดการแผนการอพยพประชาชนในกรณีฉุกเฉิน โดยระบบจะจัดสรรยานพาหนะให้กับโซนอพยพโดยอัตโนมัติ โดยคำนึงถึงระดับความเร่งด่วน, ระยะทาง, และความจุของยานพาหนะ

---

## Tech Stack

| ประเภท | เทคโนโลยี | เวอร์ชัน |
|---|---|---|
| Runtime | Node.js | >= 18.0.0 |
| Framework | Express | ^5.2.1 |
| Language | TypeScript | ^5.9.3 |
| ORM | Prisma | ^7.4.1 |
| Database (Persistent) | SQLite (via better-sqlite3) | ^12.6.2 |
| Database (In-memory/Cache) | Redis (via ioredis) | ^5.9.3 |
| Validation | Zod | ^4.3.6 |
| Geo Calculation | geolib | ^3.3.4 |
| Logger | pino + pino-pretty | ^10.3.1 |
| Testing | Jest + ts-jest | ^30.2.0 |

---

## Architecture Overview

โปรเจกต์นี้ใช้สถาปัตยกรรมแบบ **Layered Architecture** แบ่งออกเป็น 4 ชั้นหลัก:

```
HTTP Request
     │
     ▼
┌─────────────┐
│  Controller │  ← รับ Request, Validate Input (Zod), ส่ง Response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ← Business Logic, Algorithm การจัดสรรยานพาหนะ
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  ← Data Access Layer (Prisma → SQLite, Redis)
└──────┬──────┘
       │
  ┌────┴────┐
  ▼         ▼
SQLite    Redis
(Zones,   (Status
Vehicles, Tracking)
Plans)
```

---

## โครงสร้างไฟล์ (File Structure)

```
tt-interview-api/
├── src/
│   ├── index.ts                    # Entry point, Express app setup
│   ├── routes.ts                   # Route definitions + Zod error middleware
│   ├── controllers/
│   │   ├── evacuationController.ts # Handles /api/evacuations/*
│   │   ├── vehicleController.ts    # Handles /api/vehicles
│   │   ├── zoneController.ts       # Handles /api/evacuation-zones
│   │   └── index.ts                # Re-export controllers
│   ├── services/
│   │   ├── evacuationService.ts    # Core evacuation planning algorithm
│   │   ├── geoService.ts           # Haversine distance & ETA calculation
│   │   ├── zoneService.ts          # Zone business logic (duplicate check)
│   │   └── index.ts                # Re-export services
│   ├── repositories/
│   │   ├── zoneRepository.ts       # Zone CRUD (SQLite) + Status init (Redis)
│   │   ├── vehicleRepository.ts    # Vehicle CRUD (SQLite)
│   │   ├── planRepository.ts       # Plan CRUD (SQLite)
│   │   ├── statusRepository.ts     # Evacuation status CRUD (Redis)
│   │   └── index.ts                # Re-export repositories
│   ├── models/
│   │   ├── zone.ts                 # EvacuationZone Zod schema + type
│   │   ├── vehicle.ts              # Vehicle Zod schema + type
│   │   ├── evacuation.ts           # EvacuationAssignment, Status, Update schemas
│   │   ├── location.ts             # LocationCoordinates Zod schema + type
│   │   └── index.ts                # Re-export models
│   ├── middlewares/
│   │   └── errorHandler.ts         # Global error handler middleware
│   ├── utils/
│   │   ├── config.ts               # Logger (pino) + Redis client init
│   │   ├── prisma.ts               # Prisma client init (SQLite adapter)
│   │   ├── constants.ts            # HTTP status codes, error messages, constants
│   │   └── errors.ts               # HttpError custom class
│   └── tests/
│       ├── evacuationService.spec.ts
│       ├── geoService.spec.ts
│       └── errorHandler.spec.ts
├── prisma/
│   ├── schema.prisma               # Database schema (Zone, Vehicle, Plan)
│   └── migrations/                 # Migration files
├── postman/
│   └── tt-interview-api.postman_collection.json
├── .github/
│   └── workflows/
│       └── azure-deploy.yml        # CI/CD pipeline to Azure Web App
├── Dockerfile
├── docker-compose.yml
├── tsconfig.json
├── jest.config.js
└── package.json
```

---

## Data Flow: การสร้างแผนอพยพ (Generate Plan)

```
POST /api/evacuations/plan
         │
         ▼
EvacuationController.generatePlan()
         │
         ▼
EvacuationService.generatePlan()
         │
         ├── ZoneRepository.getZones()       → SQLite
         ├── VehicleRepository.getVehicles() → SQLite
         └── StatusRepository.getStatuses()  → Redis
         │
         ▼
  Sort zones by UrgencyLevel (DESC)
         │
         ▼
  For each zone (highest urgency first):
    └── assignVehiclesToZone()
          └── pickBestVehicle() → scoreVehicle()
                ├── GeoService.haversineDistance()
                └── Capacity penalty scoring
         │
         ▼
PlanRepository.savePlan() → SQLite (atomic transaction)
         │
         ▼
Return EvacuationAssignment[]
```

---

## Environment Variables

| Variable | Description | ค่าตัวอย่าง |
|---|---|---|
| `PORT` | Port ที่ server จะ listen | `3000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `DATABASE_URL` | SQLite file path | `file:./evacuation.sqlite` |
| `LOG_LEVEL` | Pino log level | `info` |
