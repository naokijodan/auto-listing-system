-- DropForeignKey
ALTER TABLE "joom_listings" DROP CONSTRAINT IF EXISTS "joom_listings_taskId_fkey";

-- DropTable
DROP TABLE IF EXISTS "joom_listings";

-- DropEnum (JoomListingStatusが他で使われていなければ)
DROP TYPE IF EXISTS "JoomListingStatus";

