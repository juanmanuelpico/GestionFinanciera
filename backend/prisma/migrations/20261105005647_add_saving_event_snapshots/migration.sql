-- AlterTable
ALTER TABLE "savings_events" ADD COLUMN     "note" VARCHAR(500),
ADD COLUMN     "quoteRate" DECIMAL(14,4),
ADD COLUMN     "quoteType" "QuoteType",
ADD COLUMN     "walletImpactAmount" DECIMAL(14,2),
ADD COLUMN     "walletImpactCurrency" VARCHAR(3);

-- Backfill: las altas existentes heredan la cotización y el descuento del ahorro.
UPDATE "savings_events" AS e
SET "quoteType" = s."quoteType",
    "quoteRate" = s."quoteRate",
    "walletImpactAmount" = s."estimatedDebit",
    "walletImpactCurrency" = s."debitCurrency",
    "note" = s."note"
FROM "savings" AS s
WHERE s."id" = e."savingId" AND e."type" = 'ALTA';

-- CreateIndex
CREATE INDEX "savings_events_userId_type_idx" ON "savings_events"("userId", "type");

-- CreateIndex
CREATE INDEX "savings_events_userId_currency_idx" ON "savings_events"("userId", "currency");
