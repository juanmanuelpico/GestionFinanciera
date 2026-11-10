-- CreateEnum
CREATE TYPE "QuoteType" AS ENUM ('BLUE', 'OFICIAL', 'MEP', 'MANUAL');

-- CreateEnum
CREATE TYPE "SavingStatus" AS ENUM ('ACTIVO', 'CERRADO');

-- CreateEnum
CREATE TYPE "SavingEventType" AS ENUM ('ALTA', 'AJUSTE_SUMA', 'AJUSTE_RESTA', 'DEVOLUCION', 'CONVERSION');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "enabledCurrencies" TEXT[] DEFAULT ARRAY['ARS']::TEXT[],
ADD COLUMN     "headerCurrency" VARCHAR(3) NOT NULL DEFAULT 'ARS';

-- CreateTable
CREATE TABLE "savings" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "quoteType" "QuoteType" NOT NULL,
    "quoteRate" DECIMAL(14,4),
    "estimatedDebit" DECIMAL(14,2) NOT NULL,
    "debitCurrency" VARCHAR(3) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "note" VARCHAR(500),
    "status" "SavingStatus" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_events" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "savingId" INTEGER NOT NULL,
    "type" "SavingEventType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "savings_userId_status_idx" ON "savings"("userId", "status");

-- CreateIndex
CREATE INDEX "savings_events_userId_createdAt_idx" ON "savings_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "savings_events_savingId_idx" ON "savings_events"("savingId");

-- AddForeignKey
ALTER TABLE "savings" ADD CONSTRAINT "savings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_events" ADD CONSTRAINT "savings_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_events" ADD CONSTRAINT "savings_events_savingId_fkey" FOREIGN KEY ("savingId") REFERENCES "savings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
