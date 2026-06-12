// PRD-035: lint alineado con next@16 — `next lint` fue eliminado en Next 16;
// se usa ESLint CLI (v9, flat config) con eslint-config-next@16 (flat nativo, sin FlatCompat).
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Reglas del React Compiler (eslint-plugin-react-hooks v6): patrones válidos
      // en código existente — fetch/localStorage en mount, refs de sync, etc.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
    },
  },
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
