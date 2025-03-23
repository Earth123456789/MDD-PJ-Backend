-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TRUCK', 'VAN', 'PICKUP', 'MOTORCYCLE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'MATCHING', 'MATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

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
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "pickup_location" JSONB NOT NULL,
    "dropoff_location" JSONB NOT NULL,
    "package_weight_kg" INTEGER NOT NULL,
    "package_volume_m3" DOUBLE PRECISION NOT NULL,
    "package_length_m" DOUBLE PRECISION NOT NULL,
    "package_width_m" DOUBLE PRECISION NOT NULL,
    "package_height_m" DOUBLE PRECISION NOT NULL,
    "vehicle_matched" INTEGER,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_vehicle_type_status_idx" ON "Vehicle"("vehicle_type", "status");

-- CreateIndex
CREATE INDEX "Vehicle_max_weight_kg_max_volume_m3_idx" ON "Vehicle"("max_weight_kg", "max_volume_m3");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_package_weight_kg_package_volume_m3_idx" ON "Order"("package_weight_kg", "package_volume_m3");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vehicle_matched_fkey" FOREIGN KEY ("vehicle_matched") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
