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
});
