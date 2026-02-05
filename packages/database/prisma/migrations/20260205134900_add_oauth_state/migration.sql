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

-- AlterTable
ALTER TABLE "marketplace_credentials" ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex (if not exists)
CREATE INDEX IF NOT EXISTS "marketplace_credentials_marketplace_isActive_idx" ON "marketplace_credentials"("marketplace", "isActive");
