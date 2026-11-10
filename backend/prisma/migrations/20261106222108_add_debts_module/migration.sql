-- CreateEnum
CREATE TYPE "DebtActorType" AS ENUM ('PERSONA', 'TARJETA');

-- CreateEnum
CREATE TYPE "DebtKind" AS ENUM ('PROPIA', 'TERCERO');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('ACTIVA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "DebtSettlementStatus" AS ENUM ('ACTIVA', 'REVERTIDA');

-- CreateEnum
CREATE TYPE "DebtMovementRole" AS ENUM ('INICIAL', 'CUOTA', 'REVERSA');

-- AlterTable
ALTER TABLE "movements" ADD COLUMN     "debtId" UUID,
ADD COLUMN     "debtMovementRole" "DebtMovementRole";

-- CreateTable
CREATE TABLE "debt_actors" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "DebtActorType" NOT NULL,
    "firstName" VARCHAR(60),
    "lastName" VARCHAR(60),
    "phone" VARCHAR(30),
    "email" VARCHAR(254),
    "alias" VARCHAR(60),
    "issuer" VARCHAR(60),
    "brand" VARCHAR(30),
    "lastFour" VARCHAR(4),
    "closingDay" INTEGER,
    "paymentDueDay" INTEGER,
    "defaultWalletCurrency" VARCHAR(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "kind" "DebtKind" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "operationDate" DATE NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "note" VARCHAR(500),
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_installments" (
    "id" UUID NOT NULL,
    "debtId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "currentSettlementId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_settlements" (
    "id" UUID NOT NULL,
    "debtId" UUID NOT NULL,
    "walletCurrency" VARCHAR(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "status" "DebtSettlementStatus" NOT NULL DEFAULT 'ACTIVA',
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_settlement_items" (
    "id" UUID NOT NULL,
    "settlementId" UUID NOT NULL,
    "installmentId" UUID NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "originalMovementUserId" UUID,
    "originalMovementId" INTEGER,
    "reversalMovementUserId" UUID,
    "reversalMovementId" INTEGER,

    CONSTRAINT "debt_settlement_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_actors_userId_type_idx" ON "debt_actors"("userId", "type");

-- CreateIndex
CREATE INDEX "debt_actors_userId_lastName_firstName_idx" ON "debt_actors"("userId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "debts_userId_kind_status_idx" ON "debts"("userId", "kind", "status");

-- CreateIndex
CREATE INDEX "debts_userId_createdAt_idx" ON "debts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "debts_actorId_idx" ON "debts"("actorId");

-- CreateIndex
CREATE INDEX "debt_installments_debtId_paidAt_idx" ON "debt_installments"("debtId", "paidAt");

-- CreateIndex
CREATE INDEX "debt_installments_currentSettlementId_idx" ON "debt_installments"("currentSettlementId");

-- CreateIndex
CREATE UNIQUE INDEX "debt_installments_debtId_number_key" ON "debt_installments"("debtId", "number");

-- CreateIndex
CREATE INDEX "debt_settlements_debtId_status_idx" ON "debt_settlements"("debtId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "debt_settlement_items_settlementId_installmentId_key" ON "debt_settlement_items"("settlementId", "installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "debt_settlement_items_originalMovementUserId_originalMoveme_key" ON "debt_settlement_items"("originalMovementUserId", "originalMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "debt_settlement_items_reversalMovementUserId_reversalMoveme_key" ON "debt_settlement_items"("reversalMovementUserId", "reversalMovementId");

-- CreateIndex
CREATE INDEX "movements_userId_debtId_idx" ON "movements"("userId", "debtId");

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_actors" ADD CONSTRAINT "debt_actors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "debt_actors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_installments" ADD CONSTRAINT "debt_installments_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_installments" ADD CONSTRAINT "debt_installments_currentSettlementId_fkey" FOREIGN KEY ("currentSettlementId") REFERENCES "debt_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_settlements" ADD CONSTRAINT "debt_settlements_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_settlement_items" ADD CONSTRAINT "debt_settlement_items_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "debt_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_settlement_items" ADD CONSTRAINT "debt_settlement_items_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "debt_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_settlement_items" ADD CONSTRAINT "debt_settlement_items_originalMovementUserId_originalMovem_fkey" FOREIGN KEY ("originalMovementUserId", "originalMovementId") REFERENCES "movements"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_settlement_items" ADD CONSTRAINT "debt_settlement_items_reversalMovementUserId_reversalMovem_fkey" FOREIGN KEY ("reversalMovementUserId", "reversalMovementId") REFERENCES "movements"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
