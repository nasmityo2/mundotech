import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

function readRoot(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const WORKFLOW_FILES = [
  '.github/workflows/ci.yml',
  '.github/workflows/secrets.yml',
] as const;

const PINNED_ACTION_SHAS = {
  checkout: '11bd71901bbe5b1630ceea73d27597364c9af683',
  setupNode: '49933ea5288caeca8642d1e84afbd3f7d6820020',
  uploadArtifact: 'ea165f8d65b6e75b540449e92b4886f43607fa02',
} as const;

const GITLEAKS_CHECKSUM =
  '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb';

describe('supply chain — GitHub Actions pinning', () => {
  it.each(WORKFLOW_FILES)('%s no usa tags @v4 en acciones oficiales', (workflowPath) => {
    const content = readRoot(workflowPath);
    expect(content).not.toMatch(/uses:\s*actions\/checkout@v\d/);
    expect(content).not.toMatch(/uses:\s*actions\/setup-node@v\d/);
    expect(content).not.toMatch(/uses:\s*actions\/upload-artifact@v\d/);
  });

  it.each(WORKFLOW_FILES)('%s fija acciones a SHA documentados', (workflowPath) => {
    const content = readRoot(workflowPath);
    expect(content).toContain(
      `actions/checkout@${PINNED_ACTION_SHAS.checkout}`,
    );
    if (workflowPath.includes('ci.yml')) {
      expect(content).toContain(
        `actions/setup-node@${PINNED_ACTION_SHAS.setupNode}`,
      );
      expect(content).toContain(
        `actions/upload-artifact@${PINNED_ACTION_SHAS.uploadArtifact}`,
      );
    }
  });
});

describe('supply chain — Dependabot', () => {
  const dependabot = readRoot('.github/dependabot.yml');

  it('no ignora actualizaciones semver-major', () => {
    expect(dependabot).not.toMatch(/version-update:semver-major/);
  });

  it('agrupa solo minor y patch sin automerge', () => {
    expect(dependabot).toContain('"minor"');
    expect(dependabot).toContain('"patch"');
    expect(dependabot).not.toMatch(/^\s*automerge:/m);
  });
});

describe('supply chain — SBOM script', () => {
  const sbomScript = readRoot('scripts/generate-sbom.sh');

  it('no descarga @latest ni usa npx -y', () => {
    expect(sbomScript).not.toMatch(/@latest/);
    expect(sbomScript).not.toMatch(/npx\s+-y/);
  });

  it('ejecuta binario local con npx --no-install', () => {
    expect(sbomScript).toMatch(/npx\s+--no-install\s+cyclonedx-npm/);
  });
});

describe('supply chain — package.json', () => {
  const packageJson = JSON.parse(readRoot('package.json')) as {
    devDependencies?: Record<string, string>;
  };

  it('declara @cyclonedx/cyclonedx-npm como devDependency con versión exacta', () => {
    const version = packageJson.devDependencies?.['@cyclonedx/cyclonedx-npm'];
    expect(version).toBeDefined();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('supply chain — Gitleaks checksum', () => {
  it('secrets.yml usa checksum SHA-256 verificado del release 8.30.1', () => {
    const secrets = readRoot('.github/workflows/secrets.yml');
    expect(secrets).toContain(`GITLEAKS_CHECKSUM: "${GITLEAKS_CHECKSUM}"`);
  });
});

describe('supply chain — documentación', () => {
  it('README menciona Gitleaks (no Gitleads)', () => {
    const readme = readRoot('README.md');
    expect(readme).toMatch(/Gitleaks/);
    expect(readme).not.toMatch(/Gitleads/);
  });

  it('docs/DEPENDENCY-SECURITY.md existe con política runtime/dev', () => {
    const path = resolve(ROOT, 'docs/DEPENDENCY-SECURITY.md');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/runtime/i);
    expect(content).toMatch(/dev/i);
    expect(content).toMatch(/SLA/i);
    expect(content).toMatch(/Prisma/i);
  });

  it('docs/OPERATIONS-RUNBOOK.md existe y referencia CI sin afirmar PASS remoto', () => {
    const path = resolve(ROOT, 'docs/OPERATIONS-RUNBOOK.md');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/ci\.yml/);
    expect(content).toMatch(/NO VERIFICADO/);
    expect(content).toMatch(/plan:check/);
  });

  it('job quality ejecuta plan:check', () => {
    const ci = readRoot('.github/workflows/ci.yml');
    expect(ci).toMatch(/npm run plan:check/);
  });
});
