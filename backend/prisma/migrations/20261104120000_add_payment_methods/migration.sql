-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'OTRO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "enabledPaymentMethods" "PaymentMethod"[] NOT NULL DEFAULT ARRAY['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'OTRO']::"PaymentMethod"[];

-- AlterTable: map legacy free-text values onto the new enum
ALTER TABLE "movements"
  ALTER COLUMN "paymentMethod" TYPE "PaymentMethod"
  USING (
    CASE
      WHEN "paymentMethod" IS NULL OR btrim("paymentMethod") = '' THEN NULL
      WHEN upper(btrim("paymentMethod")) IN ('EFECTIVO', 'CASH') THEN 'EFECTIVO'
      WHEN upper(btrim("paymentMethod")) IN ('DEBITO', 'DÉBITO', 'TARJETA DE DEBITO', 'TARJETA DE DÉBITO') THEN 'DEBITO'
      WHEN upper(btrim("paymentMethod")) IN ('CREDITO', 'CRÉDITO', 'TARJETA', 'TARJETA DE CREDITO', 'TARJETA DE CRÉDITO') THEN 'CREDITO'
      WHEN upper(btrim("paymentMethod")) IN ('TRANSFERENCIA', 'TRANSFER') THEN 'TRANSFERENCIA'
      WHEN upper(btrim("paymentMethod")) IN ('MERCADO PAGO', 'MERCADOPAGO', 'MP') THEN 'MERCADO_PAGO'
      ELSE 'OTRO'
    END
  )::"PaymentMethod";
