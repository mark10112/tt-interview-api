import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { logger } from './config';

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export const getDb = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await open({
      filename: process.env.SQLITE_DB_PATH || './evacuation.sqlite',
      driver: sqlite3.Database
    });

    // Initialize tables
    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS zones (
        ZoneID TEXT PRIMARY KEY,
        Latitude REAL NOT NULL,
        Longitude REAL NOT NULL,
        NumberOfPeople INTEGER NOT NULL,
        UrgencyLevel INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        VehicleID TEXT PRIMARY KEY,
        Capacity INTEGER NOT NULL,
        Type TEXT NOT NULL,
        Latitude REAL NOT NULL,
        Longitude REAL NOT NULL,
        Speed REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plans (
        ZoneID TEXT NOT NULL,
        VehicleID TEXT NOT NULL,
        ETA TEXT NOT NULL,
        NumberOfPeople INTEGER NOT NULL
      );
    `);

    logger.info('Connected to SQLite database successfully');
    return dbInstance;
  } catch (error) {
    logger.error(error, 'Failed to connect to SQLite database');
    throw error;
  }
};
