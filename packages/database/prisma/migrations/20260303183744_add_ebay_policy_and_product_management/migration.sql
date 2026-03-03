/*
  Warnings:

  - You are about to drop the column `sourceChannel` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "sourceChannel";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "initialPurchasePrice" INTEGER,
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "purchaseShippingCost" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ebay_policies" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "marketplaceId" TEXT NOT NULL DEFAULT 'EBAY_US',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ebay_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ebay_policies_type_policyId_marketplaceId_key" ON "ebay_policies"("type", "policyId", "marketplaceId");

-- CreateIndex
CREATE INDEX "products_tags_idx" ON "products"("tags");
