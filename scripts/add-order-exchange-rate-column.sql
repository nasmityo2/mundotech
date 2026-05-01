-- Columna opcional: tasa Bs/USD al confirmar el pedido. Si existe, total e ítems están en Bs.
-- Aplicar en producción con: psql "$DATABASE_URL" -f scripts/add-order-exchange-rate-column.sql
-- O: npx prisma db push
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "exchangeRateUsdBs" DOUBLE PRECISION;
