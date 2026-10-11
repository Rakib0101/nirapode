-- AlterEnum
ALTER TYPE "OtpType" ADD VALUE 'RESET_PIN';

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "ShareBuyRequest" ADD COLUMN     "referredById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinHash" TEXT;

-- AddForeignKey
ALTER TABLE "ShareBuyRequest" ADD CONSTRAINT "ShareBuyRequest_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
