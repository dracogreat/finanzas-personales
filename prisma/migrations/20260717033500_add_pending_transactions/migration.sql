-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE "Transaction" ADD COLUMN "recurringId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing transactions
UPDATE "Transaction" SET "status" = 'confirmed';
