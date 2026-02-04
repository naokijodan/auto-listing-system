-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MERCARI', 'YAHOO_AUCTION', 'YAHOO_FLEA', 'RAKUMA', 'RAKUTEN', 'AMAZON', 'TAKAYAMA', 'JOSHIN', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('PENDING_SCRAPE', 'PROCESSING_IMAGE', 'TRANSLATING', 'READY_TO_REVIEW', 'APPROVED', 'PUBLISHING', 'ACTIVE', 'SOLD', 'OUT_OF_STOCK', 'ERROR', 'DELETED');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "Marketplace" AS ENUM ('JOOM', 'EBAY');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_PUBLISH', 'PUBLISHING', 'ACTIVE', 'PAUSED', 'SOLD', 'ENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceHash" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "titleEn" TEXT,
    "descriptionEn" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "condition" TEXT,
    "weight" INTEGER,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "images" TEXT[],
    "processedImages" TEXT[],
    "sellerId" TEXT,
    "sellerName" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PENDING_SCRAPE',
    "translationStatus" "ProcessStatus" NOT NULL DEFAULT 'PENDING',
    "imageStatus" "ProcessStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "scrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "marketplaceListingId" TEXT,
    "listingPrice" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "marketplaceData" JSONB NOT NULL DEFAULT '{}',
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "errorMessage" TEXT,
    "listedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_logs" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "jobId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "platformFeeRate" DOUBLE PRECISION NOT NULL,
    "paymentFeeRate" DOUBLE PRECISION NOT NULL,
    "targetProfitRate" DOUBLE PRECISION NOT NULL,
    "adRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "exchangeBuffer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categorySettings" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "shippingTable" JSONB NOT NULL,
    "fuelSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dutyThreshold" DOUBLE PRECISION,
    "dutyRate" DOUBLE PRECISION,
    "handlingTime" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL DEFAULT 'JPY',
    "toCurrency" TEXT NOT NULL DEFAULT 'USD',
    "rate" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_sourceHash_idx" ON "products"("sourceHash");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_sourceId_sourceItemId_key" ON "products"("sourceId", "sourceItemId");

-- CreateIndex
CREATE INDEX "listings_marketplace_status_idx" ON "listings"("marketplace", "status");

-- CreateIndex
CREATE INDEX "listings_marketplaceListingId_idx" ON "listings"("marketplaceListingId");

-- CreateIndex
CREATE UNIQUE INDEX "listings_productId_marketplace_key" ON "listings"("productId", "marketplace");

-- CreateIndex
CREATE INDEX "job_logs_productId_idx" ON "job_logs"("productId");

-- CreateIndex
CREATE INDEX "job_logs_queueName_status_idx" ON "job_logs"("queueName", "status");

-- CreateIndex
CREATE INDEX "job_logs_createdAt_idx" ON "job_logs"("createdAt");

-- CreateIndex
CREATE INDEX "job_logs_jobId_idx" ON "job_logs"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "price_settings_name_key" ON "price_settings"("name");

-- CreateIndex
CREATE INDEX "shipping_policies_region_carrier_idx" ON "shipping_policies"("region", "carrier");

-- CreateIndex
CREATE INDEX "exchange_rates_fromCurrency_toCurrency_fetchedAt_idx" ON "exchange_rates"("fromCurrency", "toCurrency", "fetchedAt");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
