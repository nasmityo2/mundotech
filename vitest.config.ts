import path from 'node:path';
import { defineConfig } from 'vitest/config';

// PRD-032: tests unitarios de lógica pura (sin BD ni red). Las variables de
// entorno dummy permiten importar módulos que pasan por lib/env-validation.ts
// sin abrir conexiones reales (pg Pool es lazy).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NEXTAUTH_SECRET: 'vitest-secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      CRON_SECRET: 'vitest-cron-secret',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
