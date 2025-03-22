/*
  Warnings:

  - The values [UNAVAILABLE] on the enum `VehicleStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PICKUP] on the enum `VehicleType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VehicleStatus_new" AS ENUM ('AVAILABLE', 'ASSIGNED', 'IN_TRANSIT', 'MAINTENANCE', 'INACTIVE');
ALTER TABLE "Vehicle" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vehicle" ALTER COLUMN "status" TYPE "VehicleStatus_new" USING ("status"::text::"VehicleStatus_new");
ALTER TYPE "VehicleStatus" RENAME TO "VehicleStatus_old";
ALTER TYPE "VehicleStatus_new" RENAME TO "VehicleStatus";
DROP TYPE "VehicleStatus_old";
ALTER TABLE "Vehicle" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VehicleType_new" AS ENUM ('CAR', 'VAN', 'TRUCK', 'MOTORCYCLE');
ALTER TABLE "Vehicle" ALTER COLUMN "vehicle_type" TYPE "VehicleType_new" USING ("vehicle_type"::text::"VehicleType_new");
ALTER TYPE "VehicleType" RENAME TO "VehicleType_old";
ALTER TYPE "VehicleType_new" RENAME TO "VehicleType";
DROP TYPE "VehicleType_old";
COMMIT;

-- DropIndex
DROP INDEX "Order_package_weight_kg_package_volume_m3_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- DropIndex
DROP INDEX "Vehicle_max_weight_kg_max_volume_m3_idx";

-- DropIndex
DROP INDEX "Vehicle_vehicle_type_status_idx";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "package_weight_kg" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Vehicle" ALTER COLUMN "max_weight_kg" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "MatchingScore" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "weight_score" DOUBLE PRECISION NOT NULL,
    "volume_score" DOUBLE PRECISION NOT NULL,
    "dimension_score" DOUBLE PRECISION NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingAttempt" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "algorithm_used" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingAttempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MatchingScore" ADD CONSTRAINT "MatchingScore_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingScore" ADD CONSTRAINT "MatchingScore_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingAttempt" ADD CONSTRAINT "MatchingAttempt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingAttempt" ADD CONSTRAINT "MatchingAttempt_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
