-- Reparacion idempotente: partes de 20260611000100_prd_infra_datos_cache que quedaron
-- marcadas como aplicadas en _prisma_migrations pero nunca se ejecutaron en la BD real.
-- Sin categoryId (drift corregido en schema.prisma -- Product.category sigue siendo String).

-- Product.isActive (PRD-064/121)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");

-- ReviewStatus enum (PRD-122)
DO $$ BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review'
      AND column_name = 'status' AND udt_name = 'text'
  ) THEN
    UPDATE "Review" SET "status" = 'PENDING'
    WHERE "status" NOT IN ('PENDING', 'APPROVED', 'REJECTED');

    ALTER TABLE "Review" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Review" ALTER COLUMN "status" TYPE "ReviewStatus" USING ("status"::"ReviewStatus");
    ALTER TABLE "Review" ALTER COLUMN "status" SET DEFAULT 'PENDING';
  END IF;
END $$;

-- Order.status CHECK (PRD-122)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_status_valid'
  ) THEN
    UPDATE "Order" SET "status" = 'Pendiente'
    WHERE "status" NOT IN (
      'Pendiente verificación Binance', 'Pendiente', 'En Proceso',
      'Enviado', 'Entregado', 'Cancelado'
    );

    ALTER TABLE "Order" ADD CONSTRAINT "Order_status_valid" CHECK (
      "status" IN (
        'Pendiente verificación Binance', 'Pendiente', 'En Proceso',
        'Enviado', 'Entregado', 'Cancelado'
      )
    );
  END IF;
END $$;

-- AbandonedCart: recoveryToken -> recoveryTokenHash (PRD-178)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AbandonedCart' AND column_name = 'recoveryToken'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AbandonedCart' AND column_name = 'recoveryTokenHash'
  ) THEN
    DROP INDEX IF EXISTS "AbandonedCart_recoveryToken_key";
    ALTER TABLE "AbandonedCart" RENAME COLUMN "recoveryToken" TO "recoveryTokenHash";
    UPDATE "AbandonedCart"
    SET "recoveryTokenHash" = encode(sha256("recoveryTokenHash"::bytea), 'hex');
    CREATE UNIQUE INDEX "AbandonedCart_recoveryTokenHash_key" ON "AbandonedCart"("recoveryTokenHash");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Order_customerEmail_idx" ON "Order"("customerEmail");

-- OrderItem.productId -> Product RESTRICT (PRD-123)
DO $$
DECLARE orphans integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_productId_fkey'
  ) THEN
    SELECT count(*) INTO orphans
    FROM "OrderItem" oi
    LEFT JOIN "Product" p ON p."id" = oi."productId"
    WHERE p."id" IS NULL;

    IF orphans > 0 THEN
      RAISE EXCEPTION 'PRD-123: % OrderItem(s) con productId huerfano -- resolver antes de aplicar la FK.', orphans;
    END IF;

    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- CartItem.productId: Cascade -> Restrict (PRD-232)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'CartItem' AND c.conname = 'CartItem_productId_fkey'
      AND c.confdeltype = 'c'
  ) THEN
    ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productId_fkey";
    ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Review.userId ON DELETE SET NULL (PRD-217)
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User.role default (PRD-127)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIENT';

UPDATE "User"
SET "role" = CASE WHEN upper("role") = 'ADMIN' THEN 'ADMIN' ELSE 'CLIENT' END
WHERE "role" <> CASE WHEN upper("role") = 'ADMIN' THEN 'ADMIN' ELSE 'CLIENT' END;
