# Infrastructure, Deployment & Configuration

---

## 1. Database Schema (Prisma)

**ไฟล์:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Zone {
  ZoneID        String @id
  Latitude      Float
  Longitude     Float
  NumberOfPeople Int
  UrgencyLevel  Int

  @@map("zones")
}

model Vehicle {
  VehicleID  String @id
  Capacity   Int
  Type       String
  Latitude   Float
  Longitude  Float
  Speed      Float

  @@map("vehicles")
}

model Plan {
  id             Int    @id @default(autoincrement())
  ZoneID         String
  VehicleID      String
  ETA            String
  NumberOfPeople Int

  @@map("plans")
}
```

**SQLite Tables:**

| Table | Primary Key | Description |
|---|---|---|
| `zones` | `ZoneID` (String) | โซนอพยพ |
| `vehicles` | `VehicleID` (String) | ยานพาหนะ |
| `plans` | `id` (Auto-increment Int) | แผนการอพยพล่าสุด |

**Prisma Migration:**
- Migration file: `prisma/migrations/20260220050816_init/`
- ใช้ `prisma migrate dev` สำหรับ development
- ใช้ `prisma migrate deploy` สำหรับ production

---

## 2. Redis Data Structure

| Key | Type | Description |
|---|---|---|
| `evacuation:status` | Hash | สถานะการอพยพของทุกโซน |

**Hash Structure:**
```
HSET evacuation:status <ZoneID> <JSON string of EvacuationStatus>
```

**ตัวอย่าง:**
```
127.0.0.1:6379> HGETALL evacuation:status
1) "Z1"
2) "{\"ZoneID\":\"Z1\",\"TotalEvacuated\":60,\"RemainingPeople\":40}"
3) "Z2"
4) "{\"ZoneID\":\"Z2\",\"TotalEvacuated\":0,\"RemainingPeople\":50}"
```

---

## 3. Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | ❌ | `3000` | Port ที่ server จะ listen |
| `REDIS_URL` | ✅ | - | Redis connection URL เช่น `redis://localhost:6379` |
| `DATABASE_URL` | ❌ | `file:./evacuation.sqlite` | SQLite file path |
| `LOG_LEVEL` | ❌ | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |

**ตัวอย่าง `.env`:**
```env
PORT=3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=file:./evacuation.sqlite
LOG_LEVEL=info
```

---

## 4. Docker

### Dockerfile

**ไฟล์:** `Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Build Process:**
1. Base image: `node:18-alpine` (lightweight)
2. Copy `package.json` และ `package-lock.json` ก่อน (Docker layer caching)
3. `npm install` — ติดตั้ง dependencies
4. Copy source code ทั้งหมด
5. `npm run build` — compile TypeScript → JavaScript ไปที่ `dist/`
6. Expose port 3000
7. Start ด้วย `npm start` (รัน `node dist/index.js`)

---

### Docker Compose

**ไฟล์:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=info
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

**Services:**

| Service | Image | Port | Description |
|---|---|---|---|
| `app` | Build from Dockerfile | `3000:3000` | Node.js API server |
| `redis` | `redis:7-alpine` | `6379:6379` | Redis server |

**Features:**
- `depends_on: redis` — app จะรอให้ Redis start ก่อน
- `restart: unless-stopped` — restart อัตโนมัติเมื่อ crash
- `redis_data` volume — persist Redis data ระหว่าง container restart
- Redis URL ใน compose: `redis://redis:6379` (ใช้ service name เป็น hostname)

**Commands:**
```bash
# Start ทุก service
docker-compose up -d

# Stop ทุก service
docker-compose down

# ดู logs
docker-compose logs -f app

# Rebuild และ start
docker-compose up -d --build
```

---

## 5. CI/CD Pipeline (GitHub Actions → Azure)

**ไฟล์:** `.github/workflows/azure-deploy.yml`

```yaml
name: Deploy Node.js to Azure Web App

on:
  push:
    branches:
      - master

env:
  AZURE_WEBAPP_NAME: 'tt-evacuation-api'
  NODE_VERSION: '18.x'
```

**Trigger:** Push ไปที่ branch `master`

**Jobs:**

### Job 1: `build`

| Step | Action | Description |
|---|---|---|
| Checkout | `actions/checkout@v4` | Clone repository |
| Setup Node | `actions/setup-node@v3` | ติดตั้ง Node.js 18.x |
| Install & Build & Test | `npm install && npm run build && npm run test` | Build และ test |
| Zip artifact | `zip release.zip ./* -r` | Pack ไฟล์ทั้งหมด |
| Upload artifact | `actions/upload-artifact@v3` | Upload `release.zip` |

### Job 2: `deploy`

| Step | Action | Description |
|---|---|---|
| Download artifact | `actions/download-artifact@v3` | Download `release.zip` |
| Unzip | `unzip release.zip` | แตกไฟล์ |
| Deploy to Azure | `azure/webapps-deploy@v2` | Deploy ไปยัง Azure Web App |

**Secrets ที่ต้องตั้งใน GitHub:**
- `AZURE_WEBAPP_PUBLISH_PROFILE` — Publish profile จาก Azure Portal

**Azure Web App Name:** `tt-evacuation-api`

---

## 6. TypeScript Configuration

**ไฟล์:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

| Option | Value | Description |
|---|---|---|
| `target` | `es2022` | Compile เป็น ES2022 |
| `module` | `commonjs` | ใช้ CommonJS module system |
| `rootDir` | `./src` | Source directory |
| `outDir` | `./dist` | Output directory |
| `strict` | `true` | เปิด strict type checking ทั้งหมด |
| `skipLibCheck` | `true` | ข้าม type check ของ `.d.ts` files |
| `esModuleInterop` | `true` | รองรับ default import จาก CommonJS modules |

> **หมายเหตุ:** `**/*.spec.ts` ถูก exclude — test files ไม่ถูก compile เป็น production build

---

## 7. ESLint Configuration

**ไฟล์:** `eslint.config.mjs`

- ใช้ `@eslint/js` และ `typescript-eslint`
- Lint เฉพาะ `src/**/*.ts`
- Commands:
  ```bash
  npm run lint        # ตรวจสอบ
  npm run lint:fix    # แก้ไขอัตโนมัติ
  ```

---

## 8. NPM Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `nodemon src/index.ts` | Development mode (hot reload) |
| `npm run build` | `tsc` | Compile TypeScript |
| `npm start` | `node dist/index.js` | Production mode |
| `npm test` | `jest` | รัน unit tests |
| `npm run lint` | `eslint src/**/*.ts` | Lint check |
| `npm run lint:fix` | `eslint src/**/*.ts --fix` | Auto-fix lint |

---

## 9. Logging

ใช้ **pino** เป็น logger พร้อม **pino-pretty** สำหรับ development

**ไฟล์:** `src/utils/config.ts`

```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});
```

**Log Events:**

| Event | Level | Message |
|---|---|---|
| Server start | `info` | `Server is running on port {port}` |
| Redis connect | `info` | `Connected to Redis successfully` |
| Redis error | `error` | `Redis Client Error` |
| Add zone | `info` | `Added new evacuation zone` + `{ zoneId }` |
| Add vehicle | `info` | `Added new vehicle` + `{ vehicleId }` |
| Generate plan | `info` | `Generated new evacuation plan` + `{ assignmentsCount }` |
| Update status | `info` | `Updated evacuation status` + `{ zoneId, vehicleId, requestedEvacuees }` |
| Clear all | `info` | `Cleared all evacuation data` |
| Unhandled error | `error` | `Unhandled Error` |
