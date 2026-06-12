// PRD-035: lint alineado con next@16 — `next lint` fue eliminado en Next 16;
// se usa ESLint CLI (v9, flat config) con eslint-config-next@16 (flat nativo, sin FlatCompat).
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
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
