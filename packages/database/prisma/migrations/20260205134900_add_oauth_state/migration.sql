-- CreateTable
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states"("state");

-- CreateIndex
CREATE INDEX "oauth_states_provider_expiresAt_idx" ON "oauth_states"("provider", "expiresAt");

-- CreateTable (marketplace_credentials が存在しない場合に備えて)
CREATE TABLE IF NOT EXISTS "marketplace_credentials" (
    "id" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "credentials" JSONB NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_credentials_marketplace_name_key" ON "marketplace_credentials"("marketplace", "name");

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "marketplace_credentials_marketplace_isActive_idx" ON "marketplace_credentials"("marketplace", "isActive");
