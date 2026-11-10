-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "splitId" UUID;

-- CreateTable
CREATE TABLE "debt_splits" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "userAmount" DECIMAL(14,2) NOT NULL,
    "paidByActorId" UUID,
    "note" VARCHAR(500),
    "operationDate" DATE NOT NULL,
    "userShareMovementUserId" UUID,
    "userShareMovementId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_split_items" (
    "id" UUID NOT NULL,
    "splitId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_split_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_splits_userId_createdAt_idx" ON "debt_splits"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "debt_splits_paidByActorId_idx" ON "debt_splits"("paidByActorId");

-- CreateIndex
CREATE UNIQUE INDEX "debt_splits_userShareMovementUserId_userShareMovementId_key" ON "debt_splits"("userShareMovementUserId", "userShareMovementId");

-- CreateIndex
CREATE INDEX "debt_split_items_actorId_idx" ON "debt_split_items"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "debt_split_items_splitId_actorId_key" ON "debt_split_items"("splitId", "actorId");

-- CreateIndex
CREATE INDEX "debts_splitId_idx" ON "debts"("splitId");

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "debt_splits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_splits" ADD CONSTRAINT "debt_splits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_splits" ADD CONSTRAINT "debt_splits_paidByActorId_fkey" FOREIGN KEY ("paidByActorId") REFERENCES "debt_actors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_splits" ADD CONSTRAINT "debt_splits_userShareMovementUserId_userShareMovementId_fkey" FOREIGN KEY ("userShareMovementUserId", "userShareMovementId") REFERENCES "movements"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_split_items" ADD CONSTRAINT "debt_split_items_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "debt_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_split_items" ADD CONSTRAINT "debt_split_items_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "debt_actors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
