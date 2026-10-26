-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "receiptSms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiptTemplate" TEXT NOT NULL DEFAULT '{dokon}: {amal} {summa}. Jami qarzingiz: {qarz}. Rahmat!';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "items" JSONB;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(16,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'dona',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_shopId_deletedAt_idx" ON "Product"("shopId", "deletedAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
