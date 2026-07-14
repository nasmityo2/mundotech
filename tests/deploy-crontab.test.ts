import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CRONTAB_PATH = resolve(__dirname, '../deploy/crontab.vps');

describe('deploy/crontab.vps', () => {
  const content = readFileSync(CRONTAB_PATH, 'utf8');

  it('incluye purge-payment-uploads exactamente una vez', () => {
    const matches = content.match(/purge-payment-uploads/g);
    expect(matches?.length).toBe(1);
  });

  it('programa purge-payment-uploads cada hora en el minuto 15', () => {
    expect(content).toMatch(
      /^15 \* \* \* \* .+purge-payment-uploads/m,
    );
  });

  it('mantiene purge-temporary-data diario para filas DELETED', () => {
    expect(content).toMatch(
      /^0 3 \* \* \* .+purge-temporary-data/m,
    );
  });

  // --- Tests BCV cron ---
  it('la línea BCV llama scripts/run-bcv-cron.sh', () => {
    expect(content).toMatch(/scripts\/run-bcv-cron\.sh/);
  });

  it('la línea BCV conserva horarios 15 0,1,5 * * *', () => {
    expect(content).toMatch(
      /^15 0,1,5 \* \* \* .+run-bcv-cron\.sh/m,
    );
  });

  it('la línea BCV no contiene $CRON_SECRET directamente', () => {
    const bcvLine = content
      .split('\n')
      .find((line) => /run-bcv-cron\.sh/.test(line));
    expect(bcvLine).toBeDefined();
    expect(bcvLine).not.toMatch(/\$CRON_SECRET/);
  });

  it('la línea BCV redirige a /var/log/bcv-cron.log', () => {
    expect(content).toMatch(/run-bcv-cron\.sh.+\/var\/log\/bcv-cron\.log/);
  });
});
