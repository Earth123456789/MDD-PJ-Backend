/*
  Warnings:

  - You are about to drop the `Driver` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DriverVehicleAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DriverVehicleAssignment" DROP CONSTRAINT "DriverVehicleAssignment_driverId_fkey";

-- DropForeignKey
ALTER TABLE "DriverVehicleAssignment" DROP CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey";

-- DropTable
DROP TABLE "Driver";

-- DropTable
DROP TABLE "DriverVehicleAssignment";

-- DropTable
DROP TABLE "Vehicle";

-- CreateTable
CREATE TABLE "drivers" (
    "driver_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "locationLastUpdated" TIMESTAMP(3),
    "preferredVehicleTypes" TEXT[],
    "ratings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "vehicle_id" SERIAL NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "fuelCapacity" DOUBLE PRECISION NOT NULL,
    "currentFuel" DOUBLE PRECISION NOT NULL,
    "features" TEXT[],
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "locationLastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("vehicle_id")
);

-- CreateTable
CREATE TABLE "driver_vehicle_assignments" (
    "assignment_id" SERIAL NOT NULL,
    "driverId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_vehicle_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_licenseNumber_key" ON "drivers"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plateNumber_key" ON "vehicles"("plateNumber");

-- CreateIndex
CREATE INDEX "driver_vehicle_assignments_driverId_idx" ON "driver_vehicle_assignments"("driverId");

-- CreateIndex
CREATE INDEX "driver_vehicle_assignments_vehicleId_idx" ON "driver_vehicle_assignments"("vehicleId");

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("driver_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_vehicle_assignments" ADD CONSTRAINT "driver_vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;
