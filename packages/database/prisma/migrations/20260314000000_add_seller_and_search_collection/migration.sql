-- CreateTable
CREATE TABLE "sellers" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerName" TEXT,
    "sellerUrl" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "productCount" INTEGER,
    "lastScrapedAt" TIMESTAMP(3),
    "isMonitored" BOOLEAN NOT NULL DEFAULT false,
    "monitorCron" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_batch_jobs" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT,
    "jobId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sellerUrl" TEXT NOT NULL,
    "sellerName" TEXT,
    "limit" INTEGER NOT NULL DEFAULT 50,
    "productsFound" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_batch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "searchUrl" TEXT,
    "searchQuery" TEXT,
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "category" TEXT,
    "brand" TEXT,
    "aiFilterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleCron" TEXT,
    "limit" INTEGER NOT NULL DEFAULT 50,
    "totalCollected" INTEGER NOT NULL DEFAULT 0,
    "totalApproved" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_collection_runs" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "jobId" TEXT,
    "productsFound" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "filtered" INTEGER NOT NULL DEFAULT 0,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_collection_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sellers_sourceType_sellerId_key" ON "sellers"("sourceType", "sellerId");

-- CreateIndex
CREATE INDEX "sellers_isMonitored_lastScrapedAt_idx" ON "sellers"("isMonitored", "lastScrapedAt");

-- CreateIndex
CREATE INDEX "seller_batch_jobs_status_updatedAt_idx" ON "seller_batch_jobs"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "seller_batch_jobs_sellerId_idx" ON "seller_batch_jobs"("sellerId");

-- CreateIndex
CREATE INDEX "search_collections_sourceType_status_idx" ON "search_collections"("sourceType", "status");

-- CreateIndex
CREATE INDEX "search_collection_runs_collectionId_createdAt_idx" ON "search_collection_runs"("collectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "seller_batch_jobs" ADD CONSTRAINT "seller_batch_jobs_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_collection_runs" ADD CONSTRAINT "search_collection_runs_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "search_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
