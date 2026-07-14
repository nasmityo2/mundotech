import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const SHELL_TEST = resolve(__dirname, 'deploy-vps-cloudflare.test.sh');

describe('deploy-vps Cloudflare purge decision', () => {
  it('omite purga con CF_ZONE_ID/CF_API_TOKEN ausentes (exit 0)', () => {
    const output = execFileSync('bash', [SHELL_TEST], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        CF_ZONE_ID: '',
        CF_API_TOKEN: '',
      },
    });
    expect(output).toContain('purga omitida');
  });
});
