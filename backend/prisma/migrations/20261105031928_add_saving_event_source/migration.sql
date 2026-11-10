-- AlterTable
ALTER TABLE "savings_events" ADD COLUMN     "sourceAmount" DECIMAL(14,2),
ADD COLUMN     "sourceCurrency" VARCHAR(3);
