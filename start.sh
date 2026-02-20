#!/bin/sh

export DATABASE_URL="${DATABASE_URL:-file:/tmp/evacuation.sqlite}"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
npm start
