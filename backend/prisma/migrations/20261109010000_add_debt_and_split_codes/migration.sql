-- AlterTable: secuencias de códigos por usuario (patrón de "movementSequence")
ALTER TABLE "users" ADD COLUMN     "debtProperSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "debtThirdSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "splitSequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: códigos DP/DT y DG (nullable durante el backfill)
ALTER TABLE "debts" ADD COLUMN     "code" VARCHAR(16);
ALTER TABLE "debt_splits" ADD COLUMN     "code" VARCHAR(16);

-- Backfill: numerar deudas existentes por usuario y tipo, en orden de creación
WITH ranked AS (
    SELECT
        "id",
        "kind",
        ROW_NUMBER() OVER (
            PARTITION BY "userId", "kind"
            ORDER BY "createdAt", "id"
        ) AS rn
    FROM "debts"
)
UPDATE "debts" d
SET code = CASE WHEN ranked.kind = 'PROPIA'::"DebtKind" THEN 'DP' ELSE 'DT' END || ranked.rn
FROM ranked
WHERE ranked.id = d.id;

-- Backfill: numerar divisiones existentes por usuario, en orden de creación
WITH ranked AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "userId"
            ORDER BY "createdAt", "id"
        ) AS rn
    FROM "debt_splits"
)
UPDATE "debt_splits" s
SET code = 'DG' || ranked.rn
FROM ranked
WHERE ranked.id = s.id;

-- Sincronizar los contadores con el máximo ya utilizado por cada usuario
UPDATE "users" u
SET "debtProperSequence" = COALESCE((
    SELECT MAX(SUBSTR(d.code, 3)::INTEGER)
    FROM "debts" d
    WHERE d."userId" = u.id AND d.code LIKE 'DP%'
), 0);

UPDATE "users" u
SET "debtThirdSequence" = COALESCE((
    SELECT MAX(SUBSTR(d.code, 3)::INTEGER)
    FROM "debts" d
    WHERE d."userId" = u.id AND d.code LIKE 'DT%'
), 0);

UPDATE "users" u
SET "splitSequence" = COALESCE((
    SELECT MAX(SUBSTR(s.code, 3)::INTEGER)
    FROM "debt_splits" s
    WHERE s."userId" = u.id
), 0);

-- Endurecer las columnas una vez completado el backfill
ALTER TABLE "debts" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "debt_splits" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "debts_userId_code_key" ON "debts"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "debt_splits_userId_code_key" ON "debt_splits"("userId", "code");
