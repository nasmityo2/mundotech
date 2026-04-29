import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Carga las variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
