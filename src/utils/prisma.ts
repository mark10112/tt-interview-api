import { PrismaClient } from '../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const url = (process.env.DATABASE_URL ?? 'file:./evacuation.sqlite').replace('file:', '');
const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });
