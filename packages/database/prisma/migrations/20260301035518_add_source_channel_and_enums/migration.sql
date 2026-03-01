-- AlterEnum
ALTER TYPE "FulfillmentStatus" ADD VALUE 'ON_HOLD';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AUTHORIZED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "sourceChannel" TEXT;
