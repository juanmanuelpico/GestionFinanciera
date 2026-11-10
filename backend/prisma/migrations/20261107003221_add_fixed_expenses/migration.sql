-- CreateTable
CREATE TABLE "fixed_expenses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_expense_payments" (
    "id" UUID NOT NULL,
    "fixedExpenseId" UUID NOT NULL,
    "period" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "movementUserId" UUID NOT NULL,
    "movementId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_expense_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_expenses_userId_active_idx" ON "fixed_expenses"("userId", "active");

-- CreateIndex
CREATE INDEX "fixed_expenses_categoryId_idx" ON "fixed_expenses"("categoryId");

-- CreateIndex
CREATE INDEX "fixed_expense_payments_fixedExpenseId_paidAt_idx" ON "fixed_expense_payments"("fixedExpenseId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_expense_payments_fixedExpenseId_period_key" ON "fixed_expense_payments"("fixedExpenseId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_expense_payments_movementUserId_movementId_key" ON "fixed_expense_payments"("movementUserId", "movementId");

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expense_payments" ADD CONSTRAINT "fixed_expense_payments_fixedExpenseId_fkey" FOREIGN KEY ("fixedExpenseId") REFERENCES "fixed_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_expense_payments" ADD CONSTRAINT "fixed_expense_payments_movementUserId_movementId_fkey" FOREIGN KEY ("movementUserId", "movementId") REFERENCES "movements"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
