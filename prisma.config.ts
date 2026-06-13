import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Carga las variables de entorno desde el archivo .env en la raíz
dotenv.config();

export default defineConfig({
  datasource: {
    // Prisma CLI (migrate deploy, etc.) usa conexión directa — nunca PgBouncer.
    url: process.env.DIRECT_URL,
  },
});
