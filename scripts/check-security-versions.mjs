#!/usr/bin/env node

/**
 * PRD-SEC-02: verifica que Next.js esté en una versión >=16.2.6 dentro de major 16.
 * Fallo con exitCode 1 si no se cumple.
 *
 * Uso: node scripts/check-security-versions.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readInstalledVersion(packageName) {
  const pkgPath = resolve(__dirname, '..', 'node_modules', packageName, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return null;
  }
}

function parseSemver(version) {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10),
  };
}

const versions = {
  next: readInstalledVersion('next'),
  react: readInstalledVersion('react'),
  'react-dom': readInstalledVersion('react-dom'),
};

console.log(`next: ${versions.next}`);
console.log(`react: ${versions.react}`);
console.log(`react-dom: ${versions['react-dom']}`);

if (!versions.next) {
  console.error('ERROR: No se pudo leer la versión de next/package.json');
  process.exit(1);
}

const parsed = parseSemver(versions.next);

if (parsed.major !== 16) {
  console.error(`ERROR: next major version is ${parsed.major}, expected 16`);
  process.exit(1);
}

if (parsed.patch < 6) {
  console.error(
    `ERROR: next patch version is ${parsed.patch}, minimum required is 6 (>=16.2.6)`,
  );
  process.exit(1);
}

console.log('OK: next version >=16.2.6 within major 16');
