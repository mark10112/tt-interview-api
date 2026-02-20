#!/bin/sh

# รัน Prisma Migration อัตโนมัติ (จะสร้าง Table ถ้ายอด Migration ใหม่กว่าบน DB)
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Start server
echo "Starting application..."
npm start
