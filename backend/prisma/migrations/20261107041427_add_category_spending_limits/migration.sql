-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "thresholdAmount" DECIMAL(12,2),
ADD COLUMN     "thresholdCurrency" VARCHAR(3);
