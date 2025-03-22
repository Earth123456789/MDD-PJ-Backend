-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'driver', 'admin');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('motorcycle', 'car', 'pickup', 'truck');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('available', 'busy', 'offline');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "license_number" TEXT NOT NULL,
    "id_card_number" TEXT NOT NULL,
    "current_location" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DriverStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "max_weight_kg" INTEGER NOT NULL,
    "max_volume_m3" DOUBLE PRECISION NOT NULL,
    "length_m" DOUBLE PRECISION NOT NULL,
    "width_m" DOUBLE PRECISION NOT NULL,
    "height_m" DOUBLE PRECISION NOT NULL,
    "status" "VehicleStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_user_id_key" ON "Driver"("user_id");
