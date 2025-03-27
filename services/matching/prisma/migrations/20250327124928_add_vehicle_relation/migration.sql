-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_vehicle_matched_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "vehicle_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
