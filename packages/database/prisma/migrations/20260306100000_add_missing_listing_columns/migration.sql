-- AlterTable: Add missing columns to listings table
ALTER TABLE "listings" ADD COLUMN "credentialId" TEXT;
ALTER TABLE "listings" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "listings" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Add foreign key for credentialId
ALTER TABLE "listings" ADD CONSTRAINT "listings_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "marketplace_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique constraint and create new one with credentialId
DROP INDEX "listings_productId_marketplace_key";
CREATE UNIQUE INDEX "listings_productId_marketplace_credentialId_key" ON "listings"("productId", "marketplace", "credentialId");
