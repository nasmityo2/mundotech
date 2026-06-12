-- P85: añade campos SEO opcionales al modelo Category.
-- Ambos son nullable → sin impacto en categorías existentes ni necesidad de backfill.
-- description: texto plano editable desde admin; usado en meta description,
--              CollectionPage JSON-LD y el hero de la categoría.
-- seoTitle   : título SEO (≤ 70 chars); usado en <title> y JSON-LD name.
--              Null = se genera automáticamente a partir de `name`.

ALTER TABLE "Category" ADD COLUMN "description" TEXT;
ALTER TABLE "Category" ADD COLUMN "seoTitle"    TEXT;
