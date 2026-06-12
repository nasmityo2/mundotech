// PRD-035: lint alineado con next@16 — `next lint` fue eliminado en Next 16;
// se usa ESLint CLI (v9, flat config) con eslint-config-next@16.
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // Scripts operativos / artefactos — no son código de la app
      'scripts/**',
      'docs/**',
      'prisma/migrations/**',
    ],
  },
];

export default eslintConfig;
