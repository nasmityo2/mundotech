-- Migration: add_category_google_category_id
-- Adds optional Google Product Taxonomy ID override to the Category model.
-- When set by an admin, the merchant feed uses this value directly instead of
-- the automatic name-based mapping in lib/google-product-categories.ts.
ALTER TABLE "Category" ADD COLUMN "googleCategoryId" INTEGER;
