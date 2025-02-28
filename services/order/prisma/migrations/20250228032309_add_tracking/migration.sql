-- CreateTable
CREATE TABLE "Tracking" (
    "tracking_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "tracking_status" TEXT NOT NULL,
    "last_update" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tracking_pkey" PRIMARY KEY ("tracking_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tracking_order_id_key" ON "Tracking"("order_id");

-- AddForeignKey
ALTER TABLE "Tracking" ADD CONSTRAINT "Tracking_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;
