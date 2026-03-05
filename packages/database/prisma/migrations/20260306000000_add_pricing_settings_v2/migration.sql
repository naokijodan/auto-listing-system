-- CreateTable: pricing_settings_v2 (設定マスタ v2)
CREATE TABLE "pricing_settings_v2" (
    "id" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "category" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "platformFeeRate" DOUBLE PRECISION NOT NULL,
    "paymentFeeRate" DOUBLE PRECISION NOT NULL,
    "adRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitMode" TEXT NOT NULL DEFAULT 'RATE',
    "profitRate" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "profitAmount" DOUBLE PRECISION,
    "dutyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dutyProcessingFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mpfAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customsClearanceFeeJpy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "euShippingDiffJpy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exchangeBufferRate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_settings_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable: shipping_rate_entries (送料テーブル)
CREATE TABLE "shipping_rate_entries" (
    "id" TEXT NOT NULL,
    "shippingMethod" TEXT NOT NULL,
    "weightMin" INTEGER NOT NULL,
    "weightMax" INTEGER NOT NULL,
    "costJpy" DOUBLE PRECISION NOT NULL,
    "costUsd" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rate_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_price_overrides (商品個別上書き)
CREATE TABLE "product_price_overrides" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "fixedPrice" DOUBLE PRECISION,
    "customProfitRate" DOUBLE PRECISION,
    "customProfitAmount" DOUBLE PRECISION,
    "overrideReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_price_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable: price_calculation_snapshots (計算スナップショット)
CREATE TABLE "price_calculation_snapshots" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "productId" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "inputJson" JSONB NOT NULL,
    "resultJson" JSONB NOT NULL,
    "settingsJson" JSONB NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "profitRate" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_calculation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_settings_v2_marketplace_isDefault_idx" ON "pricing_settings_v2"("marketplace", "isDefault");
CREATE INDEX "pricing_settings_v2_marketplace_category_idx" ON "pricing_settings_v2"("marketplace", "category");
CREATE UNIQUE INDEX "pricing_settings_v2_marketplace_category_validFrom_key" ON "pricing_settings_v2"("marketplace", "category", "validFrom");

-- CreateIndex
CREATE INDEX "shipping_rate_entries_shippingMethod_isActive_idx" ON "shipping_rate_entries"("shippingMethod", "isActive");
CREATE UNIQUE INDEX "shipping_rate_entries_shippingMethod_weightMin_weightMax_key" ON "shipping_rate_entries"("shippingMethod", "weightMin", "weightMax");

-- CreateIndex
CREATE INDEX "product_price_overrides_productId_idx" ON "product_price_overrides"("productId");
CREATE INDEX "product_price_overrides_marketplace_isActive_idx" ON "product_price_overrides"("marketplace", "isActive");
CREATE UNIQUE INDEX "product_price_overrides_productId_marketplace_key" ON "product_price_overrides"("productId", "marketplace");

-- CreateIndex
CREATE INDEX "price_calculation_snapshots_listingId_idx" ON "price_calculation_snapshots"("listingId");
CREATE INDEX "price_calculation_snapshots_productId_marketplace_idx" ON "price_calculation_snapshots"("productId", "marketplace");
CREATE INDEX "price_calculation_snapshots_calculatedAt_idx" ON "price_calculation_snapshots"("calculatedAt");
