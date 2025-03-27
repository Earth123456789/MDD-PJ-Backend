-- CreateTable
CREATE TABLE "EmailNotificationLog" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailNotificationLog_order_id_status_key" ON "EmailNotificationLog"("order_id", "status");
