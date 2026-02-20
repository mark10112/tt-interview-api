#!/bin/sh

export DATABASE_URL="${DATABASE_URL:-file:/tmp/evacuation.sqlite}"

echo "Running Prisma db push..."
npx prisma db push --skip-generate

echo "Starting application..."
npm start
