/*
  Warnings:

  - The primary key for the `MatchingAttempt` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MatchingScore` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Vehicle` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "MatchingAttempt" DROP CONSTRAINT "MatchingAttempt_order_id_fkey";

-- DropForeignKey
ALTER TABLE "MatchingAttempt" DROP CONSTRAINT "MatchingAttempt_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "MatchingScore" DROP CONSTRAINT "MatchingScore_order_id_fkey";

-- DropForeignKey
ALTER TABLE "MatchingScore" DROP CONSTRAINT "MatchingScore_vehicle_id_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_vehicle_id_fkey";

-- AlterTable
ALTER TABLE "MatchingAttempt" DROP CONSTRAINT "MatchingAttempt_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "order_id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicle_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "MatchingAttempt_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MatchingAttempt_id_seq";

-- AlterTable
ALTER TABLE "MatchingScore" DROP CONSTRAINT "MatchingScore_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "order_id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicle_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "MatchingScore_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MatchingScore_id_seq";

-- AlterTable
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicle_id" SET DATA TYPE TEXT,
ALTER COLUMN "vehicle_matched" SET DATA TYPE TEXT,
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Order_id_seq";

-- AlterTable
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "driver_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Vehicle_id_seq";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingScore" ADD CONSTRAINT "MatchingScore_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingScore" ADD CONSTRAINT "MatchingScore_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingAttempt" ADD CONSTRAINT "MatchingAttempt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingAttempt" ADD CONSTRAINT "MatchingAttempt_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
