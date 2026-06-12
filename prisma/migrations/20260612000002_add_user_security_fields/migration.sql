-- PRD-173/240: huella de contraseña para invalidación de JWT activos
-- PRD-014/089: campos de verificación de cambio de email

ALTER TABLE "User" ADD COLUMN "passwordChangedAt"     TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "pendingEmail"           TEXT;
ALTER TABLE "User" ADD COLUMN "emailChangeToken"       TEXT;
ALTER TABLE "User" ADD COLUMN "emailChangeTokenExpiry" TIMESTAMP(3);

-- Unicidad del token de cambio de email (NULL no viola UNIQUE en PostgreSQL)
CREATE UNIQUE INDEX "User_emailChangeToken_key" ON "User"("emailChangeToken");
