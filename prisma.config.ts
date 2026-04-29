import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Carga las variables de entorno desde el archivo .env en la raíz
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
