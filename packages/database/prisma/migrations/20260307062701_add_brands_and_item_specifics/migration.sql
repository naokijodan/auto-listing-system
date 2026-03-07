/*
  Warnings:

  - You are about to drop the column `sourceChannel` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "sourceChannel";

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jpNames" TEXT[],
    "country" TEXT,
    "parentBrand" TEXT,
    "categories" TEXT[],
    "isMaterial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_specifics_fields" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tagJp" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "item_specifics_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE INDEX "brands_country_idx" ON "brands"("country");

-- CreateIndex
CREATE INDEX "brands_parentBrand_idx" ON "brands"("parentBrand");

-- CreateIndex
CREATE INDEX "item_specifics_fields_category_idx" ON "item_specifics_fields"("category");

-- CreateIndex
CREATE UNIQUE INDEX "item_specifics_fields_category_fieldName_key" ON "item_specifics_fields"("category", "fieldName");
