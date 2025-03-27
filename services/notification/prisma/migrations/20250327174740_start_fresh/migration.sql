/*
  Warnings:

  - The primary key for the `user_cache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `EmailNotificationLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrackingUpdate` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "user_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "user_cache" DROP CONSTRAINT "user_cache_pkey",
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_cache_pkey" PRIMARY KEY ("user_id");

-- DropTable
DROP TABLE "EmailNotificationLog";

-- DropTable
DROP TABLE "TrackingUpdate";

-- DropEnum
DROP TYPE "TrackingStatus";
