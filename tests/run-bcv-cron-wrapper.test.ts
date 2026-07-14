/**
 * Tests del wrapper scripts/run-bcv-cron.sh.
 *
 * Usa un `curl` falso (script bash en un directorio temporal) para simular
 * respuestas del endpoint BCV sin necesitar un servidor HTTP real.
 * Esto evita el problema de que spawnSync bloquea el event loop de Node.js,
 * lo que impediría que un mock HTTP server (en el mismo proceso) respondiera.
 *
 * No invoca producción en ningún caso.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const WRAPPER = resolve(__dirname, '../scripts/run-bcv-cron.sh');
const FAKE_SECRET = 'test-wrapper-secret-xyz';

/**
 * Crea un directorio temporal con:
 * - un env file con el contenido dado
 * - un `curl` falso que simula la respuesta deseada
 *
 * Devuelve la ruta del directorio (caller debe borrarlo).
 */
function makeMockDir(opts: {
  envContent: string;
  curlExitCode?: number;
  httpCode?: string;
  responseBody?: string;
}): { dir: string; envFile: string } {
  const dir = mkdtempSync(join(tmpdir(), 'bcv-mock-'));
  const binDir = join(dir, 'bin');
  mkdirSync(binDir);

  const envFile = join(dir, 'mundotech.env');
  writeFileSync(envFile, opts.envContent, { mode: 0o600 });

  const curlExit = opts.curlExitCode ?? 0;
  const httpCode = opts.httpCode ?? '200';
  const body = opts.responseBody ?? '{"ok":true}';

  // Mock curl: parsea -o FILE para saber dónde escribir el body, imprime
  // el HTTP code en stdout (como haría curl -w '%{http_code}').
  const curlScript = `#!/usr/bin/env bash
OUTPUT_FILE=""
args=("$@")
for i in "\${!args[@]}"; do
  if [[ "\${args[$i]}" == "-o" ]]; then
    OUTPUT_FILE="\${args[$((i+1))]}"
  fi
done
if [[ -n "$OUTPUT_FILE" ]]; then
  printf '%s' ${JSON.stringify(body)} > "$OUTPUT_FILE"
fi
printf '%s' ${JSON.stringify(httpCode)}
exit ${curlExit}
`;
  writeFileSync(join(binDir, 'curl'), curlScript, { mode: 0o755 });

  return { dir, envFile };
}

function runWrapper(envFile: string, extraEnv?: Record<string, string>) {
  return spawnSync('bash', [WRAPPER], {
    env: {
      NODE_ENV: 'test',
      PATH: process.env.PATH ?? '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      HOME: process.env.HOME ?? '/root',
      LANG: 'C',
      MUNDOTECH_ENV_FILE: envFile,
      MUNDOTECH_BCV_ENDPOINT: 'http://127.0.0.1:19999/api/cron/update-bcv-rate',
      ...(extraEnv ?? {}),
    } as NodeJS.ProcessEnv,
    encoding: 'utf8',
    timeout: 10_000,
  });
}

function runWrapperWithMock(opts: {
  envContent: string;
  curlExitCode?: number;
  httpCode?: string;
  responseBody?: string;
}) {
  const { dir, envFile } = makeMockDir(opts);
  // Prepend binDir so our fake curl is found first
  const binDir = join(dir, 'bin');
  const result = runWrapper(envFile, {
    PATH: `${binDir}:${process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin'}`,
  });
  rmSync(dir, { recursive: true, force: true });
  return result;
}

describe('scripts/run-bcv-cron.sh', () => {
  it('EnvironmentFile inexistente → exit distinto de cero', () => {
    const result = runWrapper('/tmp/no-existe-mundotech-bcv-test.env');
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/env_file_not_readable/);
  });

  it('CRON_SECRET ausente en env file → exit distinto de cero', () => {
    const result = runWrapperWithMock({
      envContent: 'OTRO_VAR=algo\n',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/cron_secret_missing/);
  });

  it('curl falla (exit distinto de 0) → exit distinto de cero', () => {
    const result = runWrapperWithMock({
      envContent: `CRON_SECRET=${FAKE_SECRET}\n`,
      curlExitCode: 7,
      httpCode: '',
      responseBody: '',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/curl_failed/);
  });

  it('endpoint devuelve HTTP 401 → exit distinto de cero', () => {
    const result = runWrapperWithMock({
      envContent: `CRON_SECRET=${FAKE_SECRET}\n`,
      httpCode: '401',
      responseBody: '{"error":"Unauthorized"}',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/endpoint_http_status/);
  });

  it('endpoint devuelve HTTP 503 + {ok:false} → exit distinto de cero', () => {
    const result = runWrapperWithMock({
      envContent: `CRON_SECRET=${FAKE_SECRET}\n`,
      httpCode: '503',
      responseBody: '{"ok":false,"reason":"fetch-failed"}',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/endpoint_http_status/);
  });

  it('endpoint devuelve HTTP 200 + {ok:false} → exit distinto de cero', () => {
    const result = runWrapperWithMock({
      envContent: `CRON_SECRET=${FAKE_SECRET}\n`,
      httpCode: '200',
      responseBody: '{"ok":false,"reason":"needs-review"}',
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/endpoint_ok_false/);
  });

  it('endpoint devuelve HTTP 200 + {ok:true} → exit 0', () => {
    const result = runWrapperWithMock({
      envContent: `CRON_SECRET=${FAKE_SECRET}\n`,
      httpCode: '200',
      responseBody: '{"ok":true,"rate":723.999}',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/SUCCESS/);
  });

  it('nunca imprime el valor de CRON_SECRET en stdout ni stderr', () => {
    const result = runWrapperWithMock({
      envContent: `CRON_SECRET=${FAKE_SECRET}\n`,
      httpCode: '200',
      responseBody: '{"ok":true}',
    });
    const combined = result.stdout + result.stderr;
    expect(combined).not.toContain(FAKE_SECRET);
  });
});
