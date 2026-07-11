import path from 'node:path';
import { defineConfig } from 'vitest/config';

// PRD-032: tests unitarios de lógica pura (sin BD ni red). Las variables de
// entorno dummy permiten importar módulos que pasan por lib/env-validation.ts
// sin abrir conexiones reales (pg Pool es lazy).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/*.test.ts', 'tests/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      NEXTAUTH_SECRET: 'vitest-secret',
      NEXTAUTH_URL: 'http://localhost:3000',
      CRON_SECRET: 'vitest-cron-secret',
      R2_PRIVATE_BUCKET_NAME: 'vitest-proofs',
      R2_PRIVATE_ACCESS_KEY_ID: 'vitest-access-key-id',
      R2_PRIVATE_SECRET_ACCESS_KEY: 'vitest-secret-access-key',
      R2_ENDPOINT: 'https://vitest.r2.cloudflarestorage.com',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
