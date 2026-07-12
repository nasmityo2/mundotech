import { describe, it, expect } from 'vitest';
import {
  BCV_STALE_MS,
  BACKUP_STALE_MS,
  PURGE_STALE_MS,
  BCV_LAST_SUCCESS_KEY,
  BACKUP_LAST_SUCCESS_KEY,
  PURGE_LAST_SUCCESS_KEY,
  OPS_APP_CONFIG_KEYS,
  isStale,
  parseTimestamp,
  buildOpsMap,
  buildPublicHealth,
  buildAdminOperationsHealth,
  type PublicHealth,
} from '@/lib/operations-health';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Crea un timestamp ISO en el pasado (hace N ms). */
function past(deltaMs: number): string {
  return new Date(Date.now() - deltaMs).toISOString();
}

const now = () => new Date().toISOString();

describe('isStale', () => {
  it('devuelve true si value es null', () => {
    expect(isStale(null, BCV_STALE_MS)).toBe(true);
  });

  it('devuelve true si value es undefined', () => {
    expect(isStale(undefined, BCV_STALE_MS)).toBe(true);
  });

  it('devuelve true si value es cadena vacía', () => {
    expect(isStale('', BCV_STALE_MS)).toBe(true);
  });

  it('devuelve true si value no es ISO válido', () => {
    expect(isStale('not-a-date', BCV_STALE_MS)).toBe(true);
    expect(isStale('2026', BCV_STALE_MS)).toBe(true);
  });

  it('devuelve true si el timestamp supera staleMs', () => {
    expect(isStale(past(BCV_STALE_MS + 60_000), BCV_STALE_MS)).toBe(true);
  });

  it('devuelve false si el timestamp es reciente', () => {
    expect(isStale(now(), BCV_STALE_MS)).toBe(false);
  });

  it('devuelve false si el timestamp está justo dentro del límite', () => {
    expect(isStale(past(BCV_STALE_MS - 60_000), BCV_STALE_MS)).toBe(false);
  });

  it('devuelve false si el timestamp está exactamente en el límite (igual a staleMs)', () => {
    // Dentro: Date.now() - ms > staleMs => false si ms <= staleMs
    expect(isStale(past(BCV_STALE_MS), BCV_STALE_MS)).toBe(false);
  });

  it('usa la ventana correcta para cada tipo (backup 26h, purge 26h)', () => {
    // Dentro de backup: 25h
    expect(isStale(past(25 * 60 * 60 * 1000), BACKUP_STALE_MS)).toBe(false);
    // Fuera de backup: 27h
    expect(isStale(past(27 * 60 * 60 * 1000), BACKUP_STALE_MS)).toBe(true);
    // Dentro de purge: 25h
    expect(isStale(past(25 * 60 * 60 * 1000), PURGE_STALE_MS)).toBe(false);
    // Fuera de purge: 27h
    expect(isStale(past(27 * 60 * 60 * 1000), PURGE_STALE_MS)).toBe(true);
  });
});

describe('parseTimestamp', () => {
  it('devuelve null si value es null', () => {
    expect(parseTimestamp(null)).toBeNull();
  });

  it('devuelve null si value es undefined', () => {
    expect(parseTimestamp(undefined)).toBeNull();
  });

  it('devuelve null si value no es ISO válido', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('not-a-date')).toBeNull();
  });

  it('devuelve ISO string limpio si value es válido', () => {
    const iso = '2026-07-11T03:00:00.000Z';
    expect(parseTimestamp(iso)).toBe(iso);
  });

  it('normaliza timezone offset a ISO', () => {
    const result = parseTimestamp('2026-07-11T03:00:00-04:00');
    expect(result).toBe('2026-07-11T07:00:00.000Z');
  });
});

describe('buildOpsMap', () => {
  it('convierte rows de Prisma a Map', () => {
    const rows = [
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ];
    const map = buildOpsMap(rows);
    expect(map.get('a')).toBe('1');
    expect(map.get('b')).toBe('2');
    expect(map.size).toBe(2);
  });

  it('devuelve Map vacío para array vacío', () => {
    expect(buildOpsMap([]).size).toBe(0);
  });

  it('sobrescribe claves duplicadas (último valor gana)', () => {
    const rows = [
      { key: 'a', value: '1' },
      { key: 'a', value: '2' },
    ];
    expect(buildOpsMap(rows).get('a')).toBe('2');
  });
});

describe('buildPublicHealth', () => {
  it('devuelve degraded + down si dbOk=false', () => {
    const map = buildOpsMap([]);
    const result = buildPublicHealth(map, false);
    expect(result).toEqual<PublicHealth>({
      status: 'degraded',
      db: 'down',
      bcvStale: true,
      backupStale: true,
      purgeStale: true,
    });
  });

  it('devuelve ok + todos stale si map vacío y dbOk=true', () => {
    const map = buildOpsMap([]);
    const result = buildPublicHealth(map, true);
    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
    expect(result.bcvStale).toBe(true);
    expect(result.backupStale).toBe(true);
    expect(result.purgeStale).toBe(true);
  });

  it('devuelve bcvStale=false si bcv_last_success_at es reciente', () => {
    const map = buildOpsMap([
      { key: BCV_LAST_SUCCESS_KEY, value: now() },
      { key: BACKUP_LAST_SUCCESS_KEY, value: now() },
      { key: PURGE_LAST_SUCCESS_KEY, value: now() },
    ]);
    const result = buildPublicHealth(map, true);
    expect(result.bcvStale).toBe(false);
    expect(result.backupStale).toBe(false);
    expect(result.purgeStale).toBe(false);
  });

  it('devuelve solo bcvStale=true si backup y purge son recientes pero bcv es stale', () => {
    const map = buildOpsMap([
      { key: BCV_LAST_SUCCESS_KEY, value: past(BCV_STALE_MS + 60_000) },
      { key: BACKUP_LAST_SUCCESS_KEY, value: now() },
      { key: PURGE_LAST_SUCCESS_KEY, value: now() },
    ]);
    const result = buildPublicHealth(map, true);
    expect(result.bcvStale).toBe(true);
    expect(result.backupStale).toBe(false);
    expect(result.purgeStale).toBe(false);
  });

  it('NO contiene timestamps ni propiedades prohibidas', () => {
    const map = buildOpsMap([
      { key: BCV_LAST_SUCCESS_KEY, value: now() },
    ]);
    const result = buildPublicHealth(map, true);
    // Propiedades prohibidas
    expect(result).not.toHaveProperty('lastBcvSuccessAt');
    expect(result).not.toHaveProperty('version');
    expect(result).not.toHaveProperty('host');
    expect(result).not.toHaveProperty('error');
    expect(result).not.toHaveProperty('timestamp');
    // Solo propiedades permitidas
    const keys = Object.keys(result);
    expect(keys).toEqual(['status', 'db', 'bcvStale', 'backupStale', 'purgeStale']);
  });

  it('status es ok aunque bcvStale=true (la tienda sigue funcionando)', () => {
    const map = buildOpsMap([
      { key: BCV_LAST_SUCCESS_KEY, value: past(BCV_STALE_MS + 60_000) },
    ]);
    const result = buildPublicHealth(map, true);
    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
  });
});

describe('buildAdminOperationsHealth', () => {
  it('devuelve todos null/stale si map vacío', () => {
    const result = buildAdminOperationsHealth(buildOpsMap([]));
    expect(result.bcv.lastSuccessAt).toBeNull();
    expect(result.bcv.stale).toBe(true);
    expect(result.backup.lastSuccessAt).toBeNull();
    expect(result.backup.stale).toBe(true);
    expect(result.purge.lastSuccessAt).toBeNull();
    expect(result.purge.stale).toBe(true);
  });

  it('devuelve timestamps ISO y stale=false para valores recientes', () => {
    const bcvTime = now();
    const backupTime = now();
    const purgeTime = now();
    const map = buildOpsMap([
      { key: BCV_LAST_SUCCESS_KEY, value: bcvTime },
      { key: BACKUP_LAST_SUCCESS_KEY, value: backupTime },
      { key: PURGE_LAST_SUCCESS_KEY, value: purgeTime },
    ]);
    const result = buildAdminOperationsHealth(map);
    expect(result.bcv.lastSuccessAt).toBe(bcvTime);
    expect(result.bcv.stale).toBe(false);
    expect(result.backup.lastSuccessAt).toBe(backupTime);
    expect(result.backup.stale).toBe(false);
    expect(result.purge.lastSuccessAt).toBe(purgeTime);
    expect(result.purge.stale).toBe(false);
  });

  it('devuelve stale correcto para cada uno independientemente', () => {
    const map = buildOpsMap([
      { key: BCV_LAST_SUCCESS_KEY, value: past(BCV_STALE_MS + 60_000) },
      { key: BACKUP_LAST_SUCCESS_KEY, value: now() },
      { key: PURGE_LAST_SUCCESS_KEY, value: past(PURGE_STALE_MS + 60_000) },
    ]);
    const result = buildAdminOperationsHealth(map);
    expect(result.bcv.stale).toBe(true);
    expect(result.backup.stale).toBe(false);
    expect(result.purge.stale).toBe(true);
  });

  it('NUNCA expone credenciales, paths ni PII', () => {
    const map = buildOpsMap([]);
    const result = buildAdminOperationsHealth(map);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/password|secret|key=|token|path|credencial/i);
  });

  it('normaliza timestamps inválidos a null', () => {
    const map = buildOpsMap([
      { key: BCV_LAST_SUCCESS_KEY, value: 'not-a-date' },
    ]);
    const result = buildAdminOperationsHealth(map);
    expect(result.bcv.lastSuccessAt).toBeNull();
    expect(result.bcv.stale).toBe(true);
  });
});

describe('OPS_APP_CONFIG_KEYS', () => {
  it('contiene exactamente las tres claves esperadas', () => {
    expect(OPS_APP_CONFIG_KEYS).toEqual([
      BCV_LAST_SUCCESS_KEY,
      BACKUP_LAST_SUCCESS_KEY,
      PURGE_LAST_SUCCESS_KEY,
    ]);
  });
});
