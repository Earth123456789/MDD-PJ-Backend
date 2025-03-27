-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('ORDER_CREATED', 'DRIVER_MATCHED', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVED_AT_PICKUP', 'PACKAGE_PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_UPDATE', 'DRIVER_UPDATE', 'SYSTEM', 'PAYMENT');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateTable
CREATE TABLE "TrackingUpdate" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "status" "TrackingStatus" NOT NULL,
    "location" JSONB,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "order_id" INTEGER,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "device_token" TEXT NOT NULL,
    "device_type" "DeviceType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cache" (
    "user_id" INTEGER NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_cache_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_user_id_device_token_key" ON "UserDevice"("user_id", "device_token");
