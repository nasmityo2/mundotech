-- PRD-204: Float → Decimal para evitar errores de redondeo binario en montos acumulados.
-- Precision/scale acordado: 12,2 para montos (Bs/USD); 12,4 para tasas de cambio.

-- Product
ALTER TABLE "Product"
  ALTER COLUMN "price"          TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2),
  ALTER COLUMN "originalPrice"  TYPE DECIMAL(12,2) USING "originalPrice"::DECIMAL(12,2);

-- Order
ALTER TABLE "Order"
  ALTER COLUMN "total"              TYPE DECIMAL(12,2) USING "total"::DECIMAL(12,2),
  ALTER COLUMN "exchangeRateUsdBs"  TYPE DECIMAL(12,4) USING "exchangeRateUsdBs"::DECIMAL(12,4),
  ALTER COLUMN "couponDiscount"     TYPE DECIMAL(12,2) USING "couponDiscount"::DECIMAL(12,2);

-- OrderItem
ALTER TABLE "OrderItem"
  ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2);

-- Coupon
ALTER TABLE "Coupon"
  ALTER COLUMN "discountValue" TYPE DECIMAL(12,2) USING "discountValue"::DECIMAL(12,2),
  ALTER COLUMN "minPurchase"   TYPE DECIMAL(12,2) USING "minPurchase"::DECIMAL(12,2),
  ALTER COLUMN "maxDiscount"   TYPE DECIMAL(12,2) USING "maxDiscount"::DECIMAL(12,2);

-- CouponRedemption
ALTER TABLE "CouponRedemption"
  ALTER COLUMN "discount" TYPE DECIMAL(12,2) USING "discount"::DECIMAL(12,2);

-- AbandonedCart
ALTER TABLE "AbandonedCart"
  ALTER COLUMN "totalUsd" TYPE DECIMAL(12,2) USING "totalUsd"::DECIMAL(12,2);
