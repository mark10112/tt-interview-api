-- CreateTable
CREATE TABLE "zones" (
    "ZoneID" TEXT NOT NULL PRIMARY KEY,
    "Latitude" REAL NOT NULL,
    "Longitude" REAL NOT NULL,
    "NumberOfPeople" INTEGER NOT NULL,
    "UrgencyLevel" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "vehicles" (
    "VehicleID" TEXT NOT NULL PRIMARY KEY,
    "Capacity" INTEGER NOT NULL,
    "Type" TEXT NOT NULL,
    "Latitude" REAL NOT NULL,
    "Longitude" REAL NOT NULL,
    "Speed" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ZoneID" TEXT NOT NULL,
    "VehicleID" TEXT NOT NULL,
    "ETA" TEXT NOT NULL,
    "NumberOfPeople" INTEGER NOT NULL
);
