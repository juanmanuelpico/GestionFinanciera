-- AlterTable
ALTER TABLE "debt_installments" ADD COLUMN     "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Backfill
UPDATE "debt_installments" SET "paidAmount" = "amount" WHERE "paidAt" IS NOT NULL;
