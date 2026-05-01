-- Fecha de validación de pago (admin). Para reportes por día de cobro real.
-- Aplicar: psql "$DATABASE_URL" -f scripts/add-order-paid-at-column.sql
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Order_paidAt_idx" ON "Order"("paidAt");
