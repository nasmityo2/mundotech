-- ─────────────────────────────────────────────────────────────────────────────
-- Migración PRD segmento 03 (INFRA-DATOS-CACHE)
-- PRD-064/121: Product.isActive (soft-delete / despublicar)
-- PRD-065:     Product.slug NOT NULL (con backfill)
-- PRD-122:     Review.status → enum ReviewStatus + CHECK en Order.status
-- PRD-123:     FK OrderItem.productId → Product (RESTRICT, preserva auditoría)
-- PRD-124:     Product.categoryId (FK de transición hacia Category)
-- PRD-125:     índice Order.customerEmail
-- PRD-127:     User.role default 'CLIENT' + normalización de datos
-- PRD-178:     AbandonedCart.recoveryToken → recoveryTokenHash (SHA-256)
-- PRD-217:     Review.userId ON DELETE SET NULL (explícito/defensivo)
-- PRD-232:     CartItem.productId Cascade → Restrict
--
-- Editada a mano sobre el diff de Prisma: los DROP/ADD COLUMN destructivos se
-- reemplazaron por RENAME/ALTER TYPE con backfill para no perder datos.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum (PRD-122)
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ── Product: isActive + categoryId (PRD-064/121, PRD-124) ────────────────────
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Backfill de categoryId emparejando por nombre (case-insensitive)
UPDATE "Product" p
SET    "categoryId" = c."id"
FROM   "Category" c
WHERE  p."categoryId" IS NULL
  AND  lower(c."name") = lower(p."category");

-- ── Product.slug NOT NULL con backfill (PRD-065) ─────────────────────────────
-- Normaliza vacíos a NULL y genera slug = slugify(name) + '-' + últimos 6 del id
-- (el sufijo garantiza unicidad del backfill frente al índice UNIQUE existente).
UPDATE "Product" SET "slug" = NULL WHERE "slug" = '';

UPDATE "Product"
SET "slug" =
  COALESCE(
    NULLIF(
      trim(BOTH '-' FROM
        regexp_replace(
          regexp_replace(
            regexp_replace(
              translate(lower("name"),
                'áàâäãéèêëíìîïóòôöõúùûüñç',
                'aaaaaeeeeiiiiooooouuuunc'),
              '[^a-z0-9 _-]', '', 'g'),
            '[ _]+', '-', 'g'),
          '-{2,}', '-', 'g')
      ),
    ''),
    'producto'
  ) || '-' || right("id", 6)
WHERE "slug" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;

-- ── User.role: default y normalización (PRD-127) ─────────────────────────────
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIENT';

UPDATE "User"
SET    "role" = CASE WHEN upper("role") = 'ADMIN' THEN 'ADMIN' ELSE 'CLIENT' END
WHERE  "role" <> CASE WHEN upper("role") = 'ADMIN' THEN 'ADMIN' ELSE 'CLIENT' END;

-- ── Review.status → enum (PRD-122) ───────────────────────────────────────────
-- Limpieza defensiva antes del cast (valores fuera del set vuelven a moderación)
UPDATE "Review" SET "status" = 'PENDING'
WHERE  "status" NOT IN ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Review" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Review" ALTER COLUMN "status" TYPE "ReviewStatus" USING ("status"::"ReviewStatus");
ALTER TABLE "Review" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- ── Order.status: CHECK a nivel de BD (PRD-122) ──────────────────────────────
-- No se usa enum Prisma: 'En Proceso' y 'Pendiente verificación Binance' llevan
-- espacios y el cliente cambiaría los literales en runtime (rompería 02/05).
-- El CHECK aplica los valores de OrderStatus (lib/definitions.ts) en la BD.
UPDATE "Order" SET "status" = 'Pendiente'
WHERE  "status" NOT IN (
  'Pendiente verificación Binance', 'Pendiente', 'En Proceso',
  'Enviado', 'Entregado', 'Cancelado'
);

ALTER TABLE "Order" ADD CONSTRAINT "Order_status_valid" CHECK (
  "status" IN (
    'Pendiente verificación Binance', 'Pendiente', 'En Proceso',
    'Enviado', 'Entregado', 'Cancelado'
  )
);

-- ── AbandonedCart: token plano → hash SHA-256 (PRD-178) ──────────────────────
-- RENAME (no DROP/ADD) para conservar filas; los tokens existentes se hashean.
-- Los enlaces de emails YA enviados dejan de funcionar (rotación de seguridad
-- deliberada: el cron emite token nuevo en cada email).
DROP INDEX "AbandonedCart_recoveryToken_key";
ALTER TABLE "AbandonedCart" RENAME COLUMN "recoveryToken" TO "recoveryTokenHash";
UPDATE "AbandonedCart"
SET    "recoveryTokenHash" = encode(sha256("recoveryTokenHash"::bytea), 'hex');
CREATE UNIQUE INDEX "AbandonedCart_recoveryTokenHash_key" ON "AbandonedCart"("recoveryTokenHash");

-- ── Índices nuevos (PRD-064/121, PRD-124, PRD-125) ───────────────────────────
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- ── FKs ──────────────────────────────────────────────────────────────────────
-- Product.categoryId → Category (PRD-124)
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- OrderItem.productId → Product (PRD-123). Pre-check con mensaje claro: si hay
-- ítems de pedido apuntando a productos ya borrados, la migración se detiene y
-- hay que decidir manualmente (re-crear producto o anonimizar el ítem).
DO $$
DECLARE orphans integer;
BEGIN
  SELECT count(*) INTO orphans
  FROM   "OrderItem" oi
  LEFT JOIN "Product" p ON p."id" = oi."productId"
  WHERE  p."id" IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION 'PRD-123: % OrderItem(s) con productId huérfano — resolver antes de aplicar la FK (ver README, sección Migraciones).', orphans;
  END IF;
END $$;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CartItem.productId: Cascade → Restrict (PRD-232)
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productId_fkey";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Review.userId: SET NULL explícito/defensivo (PRD-217) — re-crea la FK por si
-- la BD real quedó con NO ACTION por drift histórico de `db push`.
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
